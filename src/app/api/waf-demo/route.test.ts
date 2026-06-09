/**
 * Unit tests for src/app/api/waf-demo/route.ts
 *
 * Tests: input validation, DEMO_KEY guard, KV cache hit/miss,
 * X-Demo-Key injection on direct fetch, fetch error → status:0,
 * attack map URL correctness, and result shape.
 *
 * All network calls are mocked; no real HTTP is made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeKV(values: Record<string, string | null> = {}) {
  return {
    get: vi.fn().mockImplementation((key: string) =>
      Promise.resolve(values[key] ?? null)
    ),
    put: vi.fn().mockResolvedValue(undefined),
  };
}

function makeReq(body: unknown) {
  return new Request("http://localhost/api/waf-demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  delete (globalThis as Record<string, unknown>).GITHUB_CACHE;
  delete (globalThis as Record<string, unknown>).DEMO_KEY;
  process.env.DEMO_KEY = "test-demo-key";
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("input validation", () => {
  it("returns 400 for invalid attack type", async () => {
    const res = await POST(makeReq({ attack: "invalid" }));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/invalid attack type/i);
  });

  it("returns 400 for missing attack field", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/invalid attack type/i);
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/waf-demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/invalid attack type/i);
  });
});

// ---------------------------------------------------------------------------
// DEMO_KEY guard
// ---------------------------------------------------------------------------

describe("DEMO_KEY guard", () => {
  it("returns 500 when DEMO_KEY is missing", async () => {
    delete process.env.DEMO_KEY;
    delete (globalThis as Record<string, unknown>).DEMO_KEY;

    const res = await POST(makeReq({ attack: "xss" }));
    expect(res.status).toBe(500);
    const data = await res.json() as { error: string };
    expect(data.error).toBe("DEMO_KEY secret not configured");
  });
});

// ---------------------------------------------------------------------------
// KV cache
// ---------------------------------------------------------------------------

describe("KV cache", () => {
  it("returns cached result with cached:true and injects demoKey on cache hit", async () => {
    const storedPayload = {
      attack: "xss",
      label: "Reflected XSS",
      direct: { status: 200, body: "ok" },
      wafUrl: "https://waf-demo.andrewlass.com/api/echo?msg=%3Cscript%3E",
    };
    (globalThis as Record<string, unknown>).GITHUB_CACHE = makeKV({ "waf-demo:xss": JSON.stringify(storedPayload) });

    vi.mocked(globalThis.fetch).mockImplementation(() => {
      throw new Error("fetch should not be called on cache hit");
    });

    const res = await POST(makeReq({ attack: "xss" }));
    expect(res.status).toBe(200);

    const data = await res.json() as { cached: boolean; attack: string; wafFetch: { url: string; demoKey: string } };
    expect(data.cached).toBe(true);
    expect(data.attack).toBe("xss");
    expect(data.wafFetch.demoKey).toBe("test-demo-key");
    expect(data.wafFetch.url).toBe(storedPayload.wafUrl);

    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it("fires one direct fetch on cache miss and writes KV", async () => {
    const kv = makeKV();
    (globalThis as Record<string, unknown>).GITHUB_CACHE = kv;

    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("direct ok"),
        headers: { get: () => null },
      } as unknown as Response);

    const res = await POST(makeReq({ attack: "xss" }));
    expect(res.status).toBe(200);

    const data = await res.json() as { cached: boolean };
    expect(data.cached).toBe(false);

    // Only one fetch: direct. WAF fetch is browser-side.
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    // Two puts: cache write + counter increment (xss is a non-benign attack)
    expect(kv.put).toHaveBeenCalledTimes(2);
  });

  it("increments counter on non-benign attack (cache hit) and returns cached:true", async () => {
    const storedPayload = {
      attack: "xss",
      label: "Reflected XSS",
      direct: { status: 200, body: "ok" },
      wafUrl: "https://waf-demo.andrewlass.com/api/echo?msg=%3Cscript%3E",
    };
    const kv = makeKV({ "waf-demo:xss": JSON.stringify(storedPayload) });
    (globalThis as Record<string, unknown>).GITHUB_CACHE = kv;

    vi.mocked(globalThis.fetch).mockImplementation(() => {
      throw new Error("fetch should not be called on cache hit");
    });

    const res = await POST(makeReq({ attack: "xss" }));
    const data = await res.json() as { cached: boolean };

    // Counter was incremented before the cache short-circuit
    expect(kv.put).toHaveBeenCalledTimes(1);
    expect(kv.put).toHaveBeenCalledWith("waf:attacks:total", expect.any(String));

    // Response still reflects the cache hit
    expect(data.cached).toBe(true);
  });

  it("does not increment counter on benign attack", async () => {
    const kv = makeKV();
    (globalThis as Record<string, unknown>).GITHUB_CACHE = kv;

    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("benign ok"),
        headers: { get: () => null },
      } as unknown as Response);

    const res = await POST(makeReq({ attack: "benign" }));
    expect(res.status).toBe(200);

    // No microtask flushing needed: incrementAttackCounter() is guarded by
    // attack !== "benign" so it never runs; the counter key is never touched.
    // The only fire-and-forget is kvSet() which writes to a different key (waf-demo:benign).
    expect(kv.put).not.toHaveBeenCalledWith("waf:attacks:total", expect.any(String));
  });
});

// ---------------------------------------------------------------------------
// X-Demo-Key injection
// ---------------------------------------------------------------------------

describe("X-Demo-Key injection", () => {
  it("injects X-Demo-Key on the direct Fly fetch", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("ok"),
        headers: { get: () => null },
      } as unknown as Response);

    await POST(makeReq({ attack: "benign" }));

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(1);

    const headers = calls[0][1]?.headers as Record<string, string> | undefined;
    expect(headers?.["X-Demo-Key"]).toBe("test-demo-key");
  });

  it("includes demoKey in wafFetch for browser-side use", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("ok"),
        headers: { get: () => null },
      } as unknown as Response);

    const res = await POST(makeReq({ attack: "benign" }));
    const data = await res.json() as { wafFetch: { demoKey: string } };
    expect(data.wafFetch.demoKey).toBe("test-demo-key");
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("returns status:0 in direct.body when fetch throws, not a 500", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("network error"));

    const res = await POST(makeReq({ attack: "xss" }));
    expect(res.status).toBe(200);

    const data = await res.json() as { direct: { status: number; body: string } };
    expect(data.direct.status).toBe(0);
    expect(data.direct.body.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Attack map correctness
// ---------------------------------------------------------------------------

describe("attack map correctness", () => {
  function mockOneFetch() {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("ok"),
        headers: { get: () => null },
      } as unknown as Response);
  }

  it("direct fetch uses lass-waf-demo.fly.dev for xss", async () => {
    mockOneFetch();
    await POST(makeReq({ attack: "xss" }));
    const url = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
    expect(url).toContain("lass-waf-demo.fly.dev");
    expect(url).toContain("/api/echo");
  });

  it("wafFetch URL uses waf-demo.andrewlass.com for xss", async () => {
    mockOneFetch();
    const res = await POST(makeReq({ attack: "xss" }));
    const data = await res.json() as { wafFetch: { url: string } };
    expect(data.wafFetch.url).toContain("waf-demo.andrewlass.com");
    expect(data.wafFetch.url).toContain("/api/echo");
    expect(data.wafFetch.url).toContain("msg=");
  });

  it("sqli uses /api/users path", async () => {
    mockOneFetch();
    await POST(makeReq({ attack: "sqli" }));
    const url = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
    expect(url).toContain("/api/users");
    expect(url).toContain("id=");
  });

  it("traversal uses /api/file path", async () => {
    mockOneFetch();
    await POST(makeReq({ attack: "traversal" }));
    const url = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
    expect(url).toContain("/api/file");
    expect(url).toContain("name=");
  });

  it("benign uses /api/users path", async () => {
    mockOneFetch();
    await POST(makeReq({ attack: "benign" }));
    const url = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
    expect(url).toContain("/api/users");
    expect(url).toContain("id=");
  });
});

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

describe("result shape", () => {
  it("benign result has correct structure with wafFetch spec", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("user data"),
        headers: { get: () => null },
      } as unknown as Response);

    const res = await POST(makeReq({ attack: "benign" }));
    expect(res.status).toBe(200);

    const data = await res.json() as {
      attack: string;
      label: string;
      direct: { status: number; body: string };
      wafFetch: { url: string; demoKey: string };
      cached: boolean;
    };

    expect(data.attack).toBe("benign");
    expect(data.label).toBe("Benign request");
    expect(data.direct.status).toBe(200);
    expect(data.direct.body).toBe("user data");
    expect(data.wafFetch.url).toContain("waf-demo.andrewlass.com");
    expect(data.wafFetch.demoKey).toBe("test-demo-key");
    expect(data.cached).toBe(false);
  });
});
// ---------------------------------------------------------------------------
// GET /api/waf-demo — stats endpoint
// ---------------------------------------------------------------------------

describe("GET /api/waf-demo stats", () => {
  it("returns totalAttacks: 0 when KV has no counter", async () => {
    const kv = makeKV();
    (globalThis as Record<string, unknown>).GITHUB_CACHE = kv;
    const res = await GET();
    expect(res.status).toBe(200);
    const data = (await res.json()) as { totalAttacks: number };
    expect(data.totalAttacks).toBe(0);
  });

  it("returns the stored counter value from KV", async () => {
    const kv = makeKV({ "waf:attacks:total": "42" });
    (globalThis as Record<string, unknown>).GITHUB_CACHE = kv;
    const res = await GET();
    const data = (await res.json()) as { totalAttacks: number };
    expect(data.totalAttacks).toBe(42);
  });

  it("returns totalAttacks: 0 when no KV is available", async () => {
    delete (globalThis as Record<string, unknown>).GITHUB_CACHE;
    const res = await GET();
    const data = (await res.json()) as { totalAttacks: number };
    expect(data.totalAttacks).toBe(0);
  });
});
