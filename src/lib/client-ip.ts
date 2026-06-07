/**
 * Extract the true caller IP from a request.
 *
 * Inside a Cloudflare Worker the authoritative source is CF-Connecting-IP,
 * which the Cloudflare edge sets unconditionally before the Worker sees the
 * request. X-Forwarded-For is a comma-joined chain and can be spoofed when
 * read at an origin server — it is used here only as a fallback for local dev
 * where CF-Connecting-IP is absent.
 */

/**
 * Returns the caller's IP address, or null if it cannot be determined.
 *
 * Priority:
 *   1. CF-Connecting-IP  (set by Cloudflare edge — authoritative in Workers)
 *   2. First segment of X-Forwarded-For (fallback for local dev / non-CF)
 *   3. null
 */
export function getClientIp(request: Request): string | null {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim() || null;

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    return first || null;
  }

  return null;
}
