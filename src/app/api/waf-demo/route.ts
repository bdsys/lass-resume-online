/**
 * WAF demo proxy — POST /api/waf-demo
 *
 * Returns two things:
 *   1. direct  — server-side fetch to Fly (lass-waf-demo.fly.dev), bypassing WAF.
 *                Shows the raw exploit succeeding.
 *   2. wafFetch — URL + demo key for the BROWSER to fetch directly.
 *                Browser requests go through the real Cloudflare WAF edge,
 *                unlike Worker subrequests which bypass same-zone WAF rules.
 *
 * Why browser-side for the WAF path: Cloudflare Workers making subrequests to
 * hostnames in the same zone skip WAF rule evaluation by design. Only external
 * clients (browsers, curl, etc.) trigger WAF rules.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

// This route calls external services at request time — always dynamic
export const dynamic = "force-dynamic";

export type AttackType = "xss" | "sqli" | "traversal" | "benign";

interface AttackSpec {
  path: string;
  params: Record<string, string>;
}

export interface AttackResult {
  status: number;
  body: string;   // truncated to BODY_MAX_CHARS
  cfRay?: string;
}

export interface WafDemoResult {
  attack: AttackType;
  label: string;
  direct: AttackResult;
  /** Spec for a browser-side fetch to the WAF-protected endpoint. */
  wafFetch: { url: string; demoKey: string };
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_SECONDS = 60;
const BODY_MAX_CHARS = 500;
const FETCH_TIMEOUT_MS = 10_000;

const DIRECT_BASE = "https://lass-waf-demo.fly.dev";
const WAF_BASE    = "https://waf-demo.andrewlass.com";

// ---------------------------------------------------------------------------
// Attack map
// ---------------------------------------------------------------------------

const ATTACK_MAP: Record<AttackType, AttackSpec> = {
  xss:       { path: "/api/echo",  params: { msg: "<script>alert(1)</script>" } },
  sqli:      { path: "/api/users", params: { id: "1' OR '1'='1" } },
  traversal: { path: "/api/file",  params: { name: "../secret-flag.txt" } },
  benign:    { path: "/api/users", params: { id: "1" } },
};

const ATTACK_LABELS: Record<AttackType, string> = {
  xss:       "Reflected XSS",
  sqli:      "SQL Injection",
  traversal: "Path Traversal",
  benign:    "Benign request",
};

const VALID_ATTACK_TYPES = new Set<string>(Object.keys(ATTACK_MAP));

// ---------------------------------------------------------------------------
// KV cache helpers
// ---------------------------------------------------------------------------
//
// In the Workers runtime KV bindings and secrets live on
// getCloudflareContext().env — not on globalThis, and string secrets are not
// reliably mirrored into process.env for app code. We read the context directly
// (static import); outside Workers (dev/build/tests) the call throws and we fall
// back to process.env / globalThis.

type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

async function cfEnv(): Promise<Record<string, unknown> | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env as unknown as Record<string, unknown>;
  } catch {
    return null; // dev / next build / Vitest — no Workers context
  }
}

async function getKV(): Promise<KVNamespace | null> {
  const fromCf = (await cfEnv())?.GITHUB_CACHE as KVNamespace | undefined;
  if (fromCf) return fromCf;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((globalThis as any).GITHUB_CACHE as KVNamespace | undefined) ?? null;
}

async function kvGet<T>(key: string): Promise<T | null> {
  const kv = await getKV();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function kvSet<T>(key: string, value: T): Promise<void> {
  const kv = await getKV();
  if (!kv) return;
  try {
    await kv.put(key, JSON.stringify(value), { expirationTtl: CACHE_TTL_SECONDS });
  } catch {
    // Non-fatal — continue without caching
  }
}

// ---------------------------------------------------------------------------
// Secret lookup
// ---------------------------------------------------------------------------

async function getDemoKey(): Promise<string> {
  const fromProcess = process.env.DEMO_KEY as string | undefined;
  if (fromProcess) return fromProcess;
  const fromCf = (await cfEnv())?.DEMO_KEY as string | undefined;
  if (fromCf) return fromCf;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((globalThis as any).DEMO_KEY as string | undefined) ?? "";
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

async function fireAttack(
  baseUrl: string,
  spec: AttackSpec,
  demoKey: string,
): Promise<AttackResult> {
  const url = new URL(spec.path, baseUrl);
  for (const [k, v] of Object.entries(spec.params)) {
    url.searchParams.set(k, v);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
      headers: { "X-Demo-Key": demoKey },
    });

    const body = (await res.text()).slice(0, BODY_MAX_CHARS);
    const cfRay = res.headers.get("cf-ray") ?? undefined;

    return { status: res.status, body, ...(cfRay !== undefined && { cfRay }) };
  } catch {
    return {
      status: 0,
      body: "Request timed out or failed — Fly app may be cold-starting. Try again in a moment.",
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// WAF URL builder
// ---------------------------------------------------------------------------

function buildWafUrl(attack: AttackType): string {
  const spec = ATTACK_MAP[attack];
  const url = new URL(spec.path, WAF_BASE);
  for (const [k, v] of Object.entries(spec.params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

// Stored shape omits cached + demoKey (key is runtime-only, never persisted)
type StoredPayload = { attack: AttackType; label: string; direct: AttackResult; wafUrl: string };

export async function POST(request: Request): Promise<Response> {
  // 1. Parse and validate attack type
  let attack: AttackType;
  try {
    const body = (await request.json()) as { attack?: unknown };
    if (typeof body.attack !== "string" || !VALID_ATTACK_TYPES.has(body.attack)) {
      return Response.json({ error: "Invalid attack type" }, { status: 400 });
    }
    attack = body.attack as AttackType;
  } catch {
    return Response.json({ error: "Invalid attack type" }, { status: 400 });
  }

  // 2. Guard: DEMO_KEY missing → 500
  const demoKey = await getDemoKey();
  if (!demoKey) {
    return Response.json({ error: "DEMO_KEY secret not configured" }, { status: 500 });
  }

  // 3. KV cache check — demoKey is added at response time, never stored
  const cacheKey = `waf-demo:${attack}`;
  const hit = await kvGet<StoredPayload>(cacheKey);
  if (hit) {
    return Response.json({
      ...hit,
      wafFetch: { url: hit.wafUrl, demoKey },
      cached: true,
    });
  }

  // 4. Fetch direct path server-side (bypasses WAF by design — shows raw exploit)
  const spec = ATTACK_MAP[attack];
  const direct = await fireAttack(DIRECT_BASE, spec, demoKey);

  // 5. Build WAF URL for browser-side fetch (real external request → WAF fires)
  const wafUrl = buildWafUrl(attack);

  const payload: StoredPayload = { attack, label: ATTACK_LABELS[attack], direct, wafUrl };
  void kvSet(cacheKey, payload);

  return Response.json({
    ...payload,
    wafFetch: { url: wafUrl, demoKey },
    cached: false,
  });
}
