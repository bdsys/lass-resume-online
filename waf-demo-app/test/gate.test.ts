/**
 * Tests for the demo-gate middleware.
 *
 * /api/* requires X-Demo-Key matching DEMO_KEY env var.
 * / and /healthz are exempt from the gate.
 */
import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";

afterEach(() => {
  delete process.env.DEMO_KEY;
});

describe("demo gate — /api routes", () => {
  it("returns 423 when DEMO_KEY is not set in env", async () => {
    delete process.env.DEMO_KEY;
    const res = await request(buildApp()).get("/api/echo?msg=test");
    expect(res.status).toBe(423);
    expect(res.body.locked).toBe(true);
    expect(res.body.notice).toMatch(/Phase 5/);
  });

  it("returns 423 with a wrong key", async () => {
    process.env.DEMO_KEY = "correct-key";
    const res = await request(buildApp())
      .get("/api/echo?msg=test")
      .set("X-Demo-Key", "wrong-key");
    expect(res.status).toBe(423);
  });

  it("returns 423 with no key header at all", async () => {
    process.env.DEMO_KEY = "correct-key";
    const res = await request(buildApp()).get("/api/echo?msg=test");
    expect(res.status).toBe(423);
  });

  it("passes through with the correct key", async () => {
    process.env.DEMO_KEY = "correct-key";
    const res = await request(buildApp())
      .get("/api/echo?msg=hello")
      .set("X-Demo-Key", "correct-key");
    expect(res.status).toBe(200);
  });
});

describe("demo gate — exempt routes", () => {
  it("GET / does not require a key", async () => {
    delete process.env.DEMO_KEY;
    const res = await request(buildApp()).get("/");
    expect(res.status).toBe(200);
  });

  it("GET /healthz does not require a key", async () => {
    delete process.env.DEMO_KEY;
    const res = await request(buildApp()).get("/healthz");
    expect(res.status).toBe(200);
  });
});
