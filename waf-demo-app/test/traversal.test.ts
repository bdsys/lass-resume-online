/**
 * Tests for GET /api/file — path traversal endpoint.
 *
 * Reads from demo-files/ sandbox. Traversal within the sandbox is allowed (that's the vuln).
 * Traversal outside the sandbox root is blocked by the jail.
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

describe("GET /api/file (path traversal)", () => {
  it("reads a normal file from the sandbox", async () => {
    const res = await request(buildApp())
      .get("/api/file?name=public.txt")
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text/);
    expect(res.text).toContain("WAF Demo");
  });

  it("reads a file from a subdirectory", async () => {
    const res = await request(buildApp())
      .get("/api/file?name=subdir/note.txt")
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(200);
    expect(res.text).toContain("intended");
  });

  it("allows traversal to the planted secret within sandbox (the vulnerability)", async () => {
    const res = await request(buildApp())
      .get(`/api/file?name=${encodeURIComponent("subdir/../secret-flag.txt")}`)
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(200);
    expect(res.text).toContain("FLAG");
  });

  it("blocks traversal that escapes the sandbox root (jail)", async () => {
    const res = await request(buildApp())
      .get(`/api/file?name=${encodeURIComponent("../../etc/passwd")}`)
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(403);
  });

  it("blocks absolute path outside sandbox", async () => {
    const res = await request(buildApp())
      .get(`/api/file?name=${encodeURIComponent("/etc/passwd")}`)
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(403);
  });

  it("returns 404 for a missing file within the sandbox", async () => {
    const res = await request(buildApp())
      .get("/api/file?name=nonexistent.txt")
      .set("X-Demo-Key", "test-key");
    expect(res.status).toBe(404);
  });

  it("returns 423 without demo key", async () => {
    delete process.env.DEMO_KEY;
    const res = await request(buildApp()).get("/api/file?name=public.txt");
    expect(res.status).toBe(423);
  });
});
