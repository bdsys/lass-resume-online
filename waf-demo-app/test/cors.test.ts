/**
 * Tests for the CORS middleware (src/middleware/cors.ts).
 *
 * Verifies that CORS headers are present on all responses — including gated
 * paths — so the portfolio dashboard at andrewlass.com can read WAF-pass-through
 * responses from the browser.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";

const ALLOWED_ORIGIN = "https://andrewlass.com";

describe("CORS middleware", () => {
  beforeEach(() => {
    process.env.DEMO_KEY = "test-key";
  });
  afterEach(() => {
    delete process.env.DEMO_KEY;
  });

  // ── Cross-origin headers on normal responses ──────────────────────────────

  it("sets Access-Control-Allow-Origin on GET /", async () => {
    const res = await request(buildApp())
      .get("/")
      .set("Origin", ALLOWED_ORIGIN);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
  });

  it("sets Access-Control-Allow-Headers on GET /api/echo", async () => {
    const res = await request(buildApp())
      .get("/api/echo?msg=hi")
      .set("Origin", ALLOWED_ORIGIN)
      .set("X-Demo-Key", "test-key");
    expect(res.headers["access-control-allow-headers"]).toBe("X-Demo-Key");
  });

  it("sets Access-Control-Allow-Methods on GET /api/users", async () => {
    const res = await request(buildApp())
      .get("/api/users?id=1")
      .set("Origin", ALLOWED_ORIGIN)
      .set("X-Demo-Key", "test-key");
    expect(res.headers["access-control-allow-methods"]).toBe("GET, OPTIONS");
  });

  // ── CORS runs before the demo gate ───────────────────────────────────────

  it("sets CORS headers even when gate returns 423 (no key)", async () => {
    delete process.env.DEMO_KEY;
    const res = await request(buildApp())
      .get("/api/users?id=1")
      .set("Origin", ALLOWED_ORIGIN);
    expect(res.status).toBe(423);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
  });

  // ── OPTIONS preflight ─────────────────────────────────────────────────────

  it("responds 204 to OPTIONS preflight with correct CORS headers", async () => {
    const res = await request(buildApp())
      .options("/api/users")
      .set("Origin", ALLOWED_ORIGIN)
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "X-Demo-Key");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(res.headers["access-control-allow-headers"]).toBe("X-Demo-Key");
    expect(res.headers["access-control-allow-methods"]).toBe("GET, OPTIONS");
    expect(res.text).toBe("");
  });

  it("OPTIONS preflight does not require X-Demo-Key", async () => {
    const res = await request(buildApp())
      .options("/api/echo")
      .set("Origin", ALLOWED_ORIGIN);
    expect(res.status).toBe(204);
  });
});
