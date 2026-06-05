/**
 * Tests for the per-IP rate limiter on /api/*.
 *
 * Uses a low rateLimitPerWindow so tests don't fire 60+ requests.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";

beforeEach(() => {
  process.env.DEMO_KEY = "test-key";
});
afterEach(() => {
  delete process.env.DEMO_KEY;
});

describe("rate limiter", () => {
  it("allows requests up to the limit", async () => {
    const app = buildApp({ rateLimitPerWindow: 5 });
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .get("/api/echo?msg=ok")
        .set("X-Demo-Key", "test-key");
      expect(res.status).toBe(200);
    }
  });

  it("returns 429 after exceeding the limit", async () => {
    const app = buildApp({ rateLimitPerWindow: 3 });
    for (let i = 0; i < 3; i++) {
      await request(app)
        .get("/api/echo?msg=ok")
        .set("X-Demo-Key", "test-key");
    }
    const res = await request(app)
      .get("/api/echo?msg=ok")
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(429);
  });

  it("rate limit does not apply to /healthz", async () => {
    const app = buildApp({ rateLimitPerWindow: 1 });
    // Exhaust /api limit
    await request(app).get("/api/echo?msg=ok").set("X-Demo-Key", "test-key");
    await request(app).get("/api/echo?msg=ok").set("X-Demo-Key", "test-key");
    // /healthz is exempt and should still 200
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
  });
});
