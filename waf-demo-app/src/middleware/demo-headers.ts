import type { Request, Response, NextFunction } from "express";

/**
 * Sets X-Demo-Notice on every response.
 * Applied globally before all routes so no path escapes it.
 */
export function demoHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader("X-Demo-Notice", "Intentionally Vulnerable - Educational");
  next();
}
