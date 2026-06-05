/**
 * Tests for GET /api/echo — reflected XSS endpoint.
 *
 * The msg query param is injected verbatim into an HTML response — intentionally.
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

describe("GET /api/echo (reflected XSS)", () => {
  it("returns 200 HTML containing the msg value", async () => {
    const res = await request(buildApp())
      .get("/api/echo?msg=hello+world")
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text).toContain("hello world");
  });

  it("reflects a <script> tag without sanitization (the vulnerability)", async () => {
    const payload = "<script>alert(1)</script>";
    const res = await request(buildApp())
      .get(`/api/echo?msg=${encodeURIComponent(payload)}`)
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(200);
    expect(res.text).toContain(payload);
  });

  it("reflects arbitrary HTML tags verbatim", async () => {
    const payload = '<img src=x onerror="alert(2)">';
    const res = await request(buildApp())
      .get(`/api/echo?msg=${encodeURIComponent(payload)}`)
      .set("X-Demo-Key", "test-key");
    expect(res.text).toContain(payload);
  });

  it("returns 423 without demo key", async () => {
    delete process.env.DEMO_KEY;
    const res = await request(buildApp()).get("/api/echo?msg=test");
    expect(res.status).toBe(423);
  });
});
