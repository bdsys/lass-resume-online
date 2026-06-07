/**
 * Best-effort KV-backed rate limiter.
 *
 * Uses the existing GITHUB_CACHE KV namespace with namespaced keys:
 *   rl:ip:<ip>        — per-caller window counter (TTL = windowSeconds)
 *   rl:day:<YYYY-MM-DD> — global daily call counter (TTL = 86400s)
 *
 * IMPORTANT: Cloudflare KV is eventually consistent and get+put is not atomic,
 * so this limiter is best-effort, not a hard guarantee. Concurrent requests from
 * the same IP may occasionally both be allowed. The daily cap is the primary cost
 * backstop; the per-caller window is a UX rate limit for legitimate users.
 */

import { kvGet, kvSet } from "./cf-env";

const WINDOW_SECONDS = 60;

export interface RateLimitResult {
  allowed: boolean;
  /** Approximate seconds until the caller may retry. Only set when allowed=false. */
  retryAfterSeconds?: number;
}

/**
 * Checks and increments a per-caller rate limit.
 *
 * @param ip - Caller's IP address (use "unknown" if unavailable).
 * @param opts.limitPerWindow - Max calls allowed per window (default: 1).
 * @param opts.windowSeconds  - Window duration in seconds (default: 60).
 */
export async function checkPerCaller(
  ip: string | null,
  opts: { limitPerWindow?: number; windowSeconds?: number } = {},
): Promise<RateLimitResult> {
  const { limitPerWindow = 1, windowSeconds = WINDOW_SECONDS } = opts;
  const key = `rl:ip:${ip ?? "unknown"}`;

  const count = (await kvGet<number>(key)) ?? 0;
  if (count >= limitPerWindow) {
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  // Non-atomic increment — intentional; see module-level caveat.
  void kvSet(key, count + 1, windowSeconds);
  return { allowed: true };
}

/**
 * Checks and increments a global daily request cap.
 *
 * @param maxPerDay - Maximum total calls allowed on the current UTC day.
 */
export async function checkDailyCap(maxPerDay: number): Promise<RateLimitResult> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const key = `rl:day:${today}`;

  const count = (await kvGet<number>(key)) ?? 0;
  if (count >= maxPerDay) {
    return { allowed: false };
  }

  void kvSet(key, count + 1, 86_400);
  return { allowed: true };
}
