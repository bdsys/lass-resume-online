import { timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

const LOCKED_RESPONSE = {
  locked: true,
  notice: "Demo locked — WAF integration pending (Phase 5)",
};

/**
 * Soft gate for /api/* endpoints.
 *
 * Requires the X-Demo-Key header to match the DEMO_KEY environment variable.
 * Returns 423 Locked when missing, wrong, or when DEMO_KEY is unset.
 *
 * In Phase 5, the Cloudflare Worker injects the correct key so the WAF
 * dashboard can reach the endpoints while the public cannot.
 */
export function demoGate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const expected = process.env.DEMO_KEY;

  // Fail closed: no key configured → always locked.
  if (!expected) {
    res.status(423).json(LOCKED_RESPONSE);
    return;
  }

  const provided = req.get("X-Demo-Key") ?? "";

  // Length-guard before timingSafeEqual (which requires equal-length buffers).
  if (provided.length !== expected.length) {
    res.status(423).json(LOCKED_RESPONSE);
    return;
  }

  const matches = timingSafeEqual(
    Buffer.from(expected, "utf-8"),
    Buffer.from(provided, "utf-8")
  );

  if (!matches) {
    res.status(423).json(LOCKED_RESPONSE);
    return;
  }

  next();
}
