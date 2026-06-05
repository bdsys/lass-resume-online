import rateLimit from "express-rate-limit";

/**
 * Per-IP rate limiter for /api/* routes.
 * Default: 60 requests per 5-minute window.
 * Accept overrides so tests can use a small limit without firing 60+ requests.
 */
export function buildRateLimiter(
  limit = 60,
  windowMs = 5 * 60_000
) {
  return rateLimit({
    windowMs,
    limit,
    legacyHeaders: false,
    message: { error: "Too many requests. Slow down." },
  });
}
