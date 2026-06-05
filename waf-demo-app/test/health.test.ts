/**
 * Tests for GET /healthz — Fly.io health check endpoint.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app";

describe("GET /healthz", () => {
  it("returns 200 with JSON { status: 'ok' }", async () => {
    const res = await request(buildApp()).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("does not require a demo key", async () => {
    delete process.env.DEMO_KEY;
    const res = await request(buildApp()).get("/healthz");
    expect(res.status).toBe(200);
  });
});
