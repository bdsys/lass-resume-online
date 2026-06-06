import type { Request, Response, NextFunction } from "express";

const ALLOWED_ORIGIN = "https://andrewlass.com";

/**
 * CORS for the portfolio dashboard at andrewlass.com.
 * Allows the browser to read WAF-pass-through responses (benign requests).
 * WAF-blocked responses (403) come from Cloudflare and won't carry these
 * headers — the browser catches those as a TypeError on the WAF fetch.
 */
export function cors(req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "X-Demo-Key");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
