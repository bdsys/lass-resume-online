/**
 * buildApp() factory — creates and returns the configured Express app.
 *
 * Keeping listen() out of this module lets supertest drive the app in tests
 * without binding a port.  server.ts is the only place that calls listen().
 *
 * Middleware order:
 *   trust proxy → demo-headers (all responses)
 *   → landing /  (gate-exempt)
 *   → health /healthz  (gate-exempt)
 *   → rate-limit on /api
 *   → demo-gate on /api
 *   → /api/* routes
 */
import express from "express";
import { cors } from "./middleware/cors";
import { demoHeaders } from "./middleware/demo-headers";
import { buildRateLimiter } from "./middleware/rate-limit";
import { demoGate } from "./middleware/demo-gate";
import { landingRouter } from "./routes/landing";
import { healthRouter } from "./routes/health";
import { xssRouter } from "./routes/xss";
import { sqliRouter } from "./routes/sqli";
import { traversalRouter } from "./routes/traversal";

export interface AppOptions {
  /** Override the per-window request limit (default 60). Useful in tests. */
  rateLimitPerWindow?: number;
  /** Override the rate-limit window in ms (default 5 min). */
  rateLimitWindowMs?: number;
}

export function buildApp(opts: AppOptions = {}): express.Express {
  const app = express();

  // Trust exactly one proxy hop (the Fly.io edge proxy) for real client IP.
  // Using `1` rather than `true` satisfies express-rate-limit's proxy validation.
  app.set("trust proxy", 1);

  // CORS for the portfolio dashboard + X-Demo-Notice on every response.
  app.use(cors);
  app.use(demoHeaders);

  // Gate-exempt routes.
  app.use(landingRouter);
  app.use(healthRouter);

  // Rate-limit then demo-gate for all /api/* routes.
  const limiter = buildRateLimiter(
    opts.rateLimitPerWindow,
    opts.rateLimitWindowMs
  );
  app.use("/api", limiter);
  app.use("/api", demoGate);

  // Vulnerable routes (behind rate-limit + gate).
  app.use(xssRouter);
  app.use(sqliRouter);
  app.use(traversalRouter);

  return app;
}
