/**
 * Tests that X-Demo-Notice is present on every response regardless of route or gate state.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";

describe("X-Demo-Notice header", () => {
  beforeEach(() => {
    process.env.DEMO_KEY = "test-key";
  });
  afterEach(() => {
    delete process.env.DEMO_KEY;
  });

  it("is present on GET /", async () => {
    const res = await request(buildApp()).get("/");
    expect(res.headers["x-demo-notice"]).toBe(
      "Intentionally Vulnerable - Educational"
    );
  });

  it("is present on GET /healthz", async () => {
    const res = await request(buildApp()).get("/healthz");
    expect(res.headers["x-demo-notice"]).toBe(
      "Intentionally Vulnerable - Educational"
    );
  });

  it("is present on /api/echo even when DEMO_KEY is missing (gate returns 423)", async () => {
    delete process.env.DEMO_KEY;
    const res = await request(buildApp()).get("/api/echo?msg=hi");
    expect(res.status).toBe(423);
    expect(res.headers["x-demo-notice"]).toBe(
      "Intentionally Vulnerable - Educational"
    );
  });
});
