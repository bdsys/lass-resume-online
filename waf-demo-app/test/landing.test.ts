/**
 * Tests for GET / — the HTML landing/explanation page.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";

describe("GET /", () => {
  it("returns 200 HTML", async () => {
    const res = await request(buildApp()).get("/");
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
  });

  it("mentions WAF and Educational purpose", async () => {
    const res = await request(buildApp()).get("/");
    expect(res.text).toContain("WAF");
    expect(res.text).toContain("Educational");
  });

  it("does not require a demo key", async () => {
    delete process.env.DEMO_KEY;
    const res = await request(buildApp()).get("/");
    expect(res.status).toBe(200);
  });

  it("includes X-Demo-Notice header", async () => {
    const res = await request(buildApp()).get("/");
    expect(res.headers["x-demo-notice"]).toBe(
      "Intentionally Vulnerable - Educational"
    );
  });
});
