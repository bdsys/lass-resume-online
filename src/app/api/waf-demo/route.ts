/**
 * WAF demo proxy — POST /api/waf-demo
 *
 * Fires two live fetches per attack:
 *   1. Direct to Fly (lass-waf-demo.fly.dev)  → exploit succeeds
 *   2. Through Cloudflare WAF (waf-demo.andrewlass.com) → WAF blocks or passes
 *
 * The browser never sees DEMO_KEY or touches the backend directly.
 */

// This route calls external services at request time — always dynamic
export const dynamic = "force-dynamic";

export type AttackType = "xss" | "sqli" | "traversal" | "benign";

interface AttackSpec {
  path: string;
  params: Record<string, string>;
}

interface AttackResult {
  status: number;
  body: string;   // truncated to BODY_MAX_CHARS
  cfRay?: string; // present only on WAF response when CF proxied it
}

export interface WafDemoResult {
  attack: AttackType;
  label: string;
  direct: AttackResult;
  waf: AttackResult;
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_SECONDS = 60;   // short TTL — demo needs to feel live
const BODY_MAX_CHARS = 500;     // prevent huge responses from leaking into cache
const FETCH_TIMEOUT_MS = 10_000; // Fly cold-starts from scale-to-zero can take ~5s

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
// KV cache helpers (only available in Workers runtime)
// ---------------------------------------------------------------------------

type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

function getKV(): KVNamespace | null {
  // Reuses the shared GITHUB_CACHE KV binding (wrangler.toml) — no separate
  // namespace needed for a 60-second demo cache. Not available in local next dev.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).GITHUB_CACHE ?? null;
}

async function kvGet<T>(key: string): Promise<T | null> {
  const kv = getKV();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function kvSet<T>(key: string, value: T): Promise<void> {
  const kv = getKV();
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

function getDemoKey(): string {
  // Workers expose secrets on globalThis; Next.js dev reads from process.env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((globalThis as any).DEMO_KEY ?? process.env.DEMO_KEY ?? "") as string;
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
// POST handler
// ---------------------------------------------------------------------------

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
  const demoKey = getDemoKey();
  if (!demoKey) {
    return Response.json({ error: "DEMO_KEY secret not configured" }, { status: 500 });
  }

  // 3. KV cache check (stored payload omits `cached` field; add it on read)
  const cacheKey = `waf-demo:${attack}`;
  type StoredPayload = Omit<WafDemoResult, "cached">;
  const hit = await kvGet<StoredPayload>(cacheKey);
  if (hit) {
    return Response.json({ ...hit, cached: true });
  }

  // 4. Fire both fetches concurrently
  const spec = ATTACK_MAP[attack];
  const [direct, waf] = await Promise.all([
    fireAttack(DIRECT_BASE, spec, demoKey),
    fireAttack(WAF_BASE, spec, demoKey),
  ]);

  // 5. Shape result, KV store (non-blocking), return JSON
  // Store without `cached` flag so the stored shape is neutral
  const payload = { attack, label: ATTACK_LABELS[attack], direct, waf };
  void kvSet(cacheKey, payload); // fire-and-forget — never await

  return Response.json({ ...payload, cached: false });
}
