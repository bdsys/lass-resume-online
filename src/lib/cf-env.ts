/**
 * Shared Cloudflare Workers bindings & secrets helpers.
 *
 * In the Workers runtime, KV bindings and string secrets live on
 * getCloudflareContext().env — not on globalThis, and string secrets are not
 * reliably mirrored into process.env for app code. We read the context directly.
 *
 * `{ async: true }` is required for dynamic/SSR route handlers.
 * Outside Workers (next dev, next build, Vitest) the call throws and we fall
 * back to process.env (.env.local in dev) / globalThis (test shims).
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

export type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

/** Returns the Cloudflare Workers env object, or null outside the Workers runtime. */
export async function cfEnv(): Promise<Record<string, unknown> | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env as unknown as Record<string, unknown>;
  } catch {
    return null; // dev / next build / Vitest — no Workers context
  }
}

/**
 * Reads a named secret in canonical priority order:
 *   process.env (dev/.env.local, tests)
 *   → getCloudflareContext().env (Workers runtime wrangler secrets)
 *   → globalThis (test shims)
 */
export async function getSecret(name: string): Promise<string | undefined> {
  const fromProcess = process.env[name] as string | undefined;
  if (fromProcess) return fromProcess;
  const fromCf = (await cfEnv())?.[name] as string | undefined;
  if (fromCf) return fromCf;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any)[name] as string | undefined;
}

/** Returns the GITHUB_CACHE KV namespace, or null if unavailable. */
export async function getKV(): Promise<KVNamespace | null> {
  const fromCf = (await cfEnv())?.GITHUB_CACHE as KVNamespace | undefined;
  if (fromCf) return fromCf;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((globalThis as any).GITHUB_CACHE as KVNamespace | undefined) ?? null;
}

/** Gets a JSON-parsed value from KV, or null on miss / error. */
export async function kvGet<T>(key: string): Promise<T | null> {
  const kv = await getKV();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Subset of Cloudflare's IncomingRequestCfProperties we expose on the IP route. */
export type CfGeoData = {
  country?:        string;
  region?:         string;
  city?:           string;
  continent?:      string;
  asOrganization?: string;
  asn?:            number;
  colo?:           string;
  tlsVersion?:     string;
  httpProtocol?:   string;
};

/**
 * Returns selected Cloudflare request metadata from `getCloudflareContext().cf`.
 * Returns `null` outside the Workers runtime (dev / build / Vitest).
 */
export async function getCf(): Promise<CfGeoData | null> {
  try {
    const { cf } = await getCloudflareContext({ async: true });
    if (!cf) return null;
    // Extract only the subset we intend to expose publicly
    const {
      country, region, city, continent,
      asOrganization, asn, colo,
      tlsVersion, httpProtocol,
    } = cf as Record<string, unknown>;
    return {
      country:        country        as string | undefined,
      region:         region         as string | undefined,
      city:           city           as string | undefined,
      continent:      continent      as string | undefined,
      asOrganization: asOrganization as string | undefined,
      asn:            asn            as number | undefined,
      colo:           colo           as string | undefined,
      tlsVersion:     tlsVersion     as string | undefined,
      httpProtocol:   httpProtocol   as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Stores a JSON-serialised value in KV with the given TTL (seconds).
 * Non-fatal on error — callers continue without caching.
 */
export async function kvSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const kv = await getKV();
  if (!kv) return;
  try {
    await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  } catch {
    // Non-fatal — continue without caching
  }
}
