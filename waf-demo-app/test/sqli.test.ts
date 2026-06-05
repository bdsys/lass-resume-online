/**
 * Tests for GET /api/users — SQL injection endpoint.
 *
 * Runs string-concatenated SQL against in-memory SQLite seeded with fake users.
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

describe("GET /api/users (SQL injection)", () => {
  it("returns one row for a legitimate id", async () => {
    const res = await request(buildApp())
      .get("/api/users?id=1")
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.rows[0].name).toBe("Alice Admin");
  });

  it("returns all rows via OR 1=1 injection", async () => {
    const payload = encodeURIComponent("1' OR '1'='1");
    const res = await request(buildApp())
      .get(`/api/users?id=${payload}`)
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(200);
    expect(res.body.rows.length).toBeGreaterThan(1);
  });

  it("returns empty rows array for unknown id", async () => {
    const res = await request(buildApp())
      .get("/api/users?id=99999")
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(0);
  });

  it("returns JSON with a rows array", async () => {
    const res = await request(buildApp())
      .get("/api/users?id=1")
      .set("X-Demo-Key", "test-key");
    expect(res.type).toMatch(/json/);
    expect(Array.isArray(res.body.rows)).toBe(true);
  });

  it("returns 423 without demo key", async () => {
    delete process.env.DEMO_KEY;
    const res = await request(buildApp()).get("/api/users?id=1");
    expect(res.status).toBe(423);
  });
});
