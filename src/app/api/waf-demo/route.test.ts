/**
 * Unit tests for src/app/api/waf-demo/route.ts
 *
 * Tests: input validation, DEMO_KEY guard, KV cache hit/miss,
 * X-Demo-Key injection on both fetches, fetch error → status:0,
 * and attack map URL correctness.
 *
 * All network calls are mocked; no real HTTP is made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeMockFetch(status: number, body: string, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    text: vi.fn().mockResolvedValue(body),
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as unknown as Response);
}

function makeKV(cachedValue: unknown = null) {
  return {
    get: vi.fn().mockResolvedValue(
      cachedValue === null ? null : JSON.stringify(cachedValue)
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
  it("returns cached result with cached:true on cache hit", async () => {
    const storedPayload = {
      attack: "xss",
      label: "Reflected XSS",
      direct: { status: 200, body: "ok" },
      waf: { status: 403, body: "blocked" },
    };
    (globalThis as Record<string, unknown>).GITHUB_CACHE = makeKV(storedPayload);

    // fetch should NOT be called on a cache hit
    vi.mocked(globalThis.fetch).mockImplementation(() => {
      throw new Error("fetch should not be called on cache hit");
    });

    const res = await POST(makeReq({ attack: "xss" }));
    expect(res.status).toBe(200);

    const data = await res.json() as { cached: boolean; attack: string };
    expect(data.cached).toBe(true);
    expect(data.attack).toBe("xss");

    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it("fires two fetches on cache miss and writes KV", async () => {
    const kv = makeKV(null); // cache miss
    (globalThis as Record<string, unknown>).GITHUB_CACHE = kv;

    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("direct ok"),
        headers: { get: () => null },
      } as unknown as Response)
      .mockResolvedValueOnce({
        status: 403,
        ok: false,
        text: vi.fn().mockResolvedValue("blocked"),
        headers: { get: () => null },
      } as unknown as Response);

    const res = await POST(makeReq({ attack: "xss" }));
    expect(res.status).toBe(200);

    const data = await res.json() as { cached: boolean };
    expect(data.cached).toBe(false);

    // fetch was called twice (direct + WAF)
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);

    // KV put is fire-and-forget; give the microtask queue a tick to flush
    await Promise.resolve();
    expect(kv.put).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// X-Demo-Key injection
// ---------------------------------------------------------------------------

describe("X-Demo-Key injection", () => {
  it("injects X-Demo-Key on both direct and WAF fetches", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("ok"),
        headers: { get: () => null },
      } as unknown as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("ok"),
        headers: { get: () => null },
      } as unknown as Response);

    await POST(makeReq({ attack: "benign" }));

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    expect(calls).toHaveLength(2);

    const headers0 = calls[0][1]?.headers as Record<string, string> | undefined;
    const headers1 = calls[1][1]?.headers as Record<string, string> | undefined;

    expect(headers0?.["X-Demo-Key"]).toBe("test-demo-key");
    expect(headers1?.["X-Demo-Key"]).toBe("test-demo-key");
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("returns status:0 in body when fetch throws, not a 500", async () => {
    vi.mocked(globalThis.fetch)
      .mockRejectedValueOnce(new Error("network error"))
      .mockRejectedValueOnce(new Error("network error"));

    const res = await POST(makeReq({ attack: "xss" }));
    expect(res.status).toBe(200);

    const data = await res.json() as {
      direct: { status: number; body: string };
      waf: { status: number; body: string };
    };
    expect(data.direct.status).toBe(0);
    expect(data.direct.body.length).toBeGreaterThan(0);
  });

  it("concurrent fetches — both errors return gracefully", async () => {
    vi.mocked(globalThis.fetch)
      .mockRejectedValueOnce(new Error("abort"))
      .mockRejectedValueOnce(new Error("abort"));

    const res = await POST(makeReq({ attack: "sqli" }));
    expect(res.status).toBe(200);

    const data = await res.json() as {
      direct: { status: number };
      waf: { status: number };
    };
    expect(data.direct.status).toBe(0);
    expect(data.waf.status).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Attack map correctness
// ---------------------------------------------------------------------------

describe("attack map correctness", () => {
  const twoOkFetches = () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("ok"),
        headers: { get: () => null },
      } as unknown as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("ok"),
        headers: { get: () => null },
      } as unknown as Response);
  };

  it("uses correct path and params for xss attack", async () => {
    twoOkFetches();

    await POST(makeReq({ attack: "xss" }));

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const url0 = String(calls[0][0]);
    const url1 = String(calls[1][0]);

    expect(url0).toContain("/api/echo");
    expect(url0).toContain("msg=");
    expect(url1).toContain("/api/echo");
    expect(url1).toContain("msg=");
  });

  it("uses correct path for traversal attack", async () => {
    twoOkFetches();

    await POST(makeReq({ attack: "traversal" }));

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const url0 = String(calls[0][0]);
    const url1 = String(calls[1][0]);

    expect(url0).toContain("/api/file");
    expect(url0).toContain("name=");
    expect(url1).toContain("/api/file");
    expect(url1).toContain("name=");
  });

  it("uses correct path for sqli attack", async () => {
    twoOkFetches();

    await POST(makeReq({ attack: "sqli" }));

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const url0 = String(calls[0][0]);

    expect(url0).toContain("/api/users");
    expect(url0).toContain("id=");
  });

  it("uses correct path for benign attack", async () => {
    twoOkFetches();

    await POST(makeReq({ attack: "benign" }));

    const calls = vi.mocked(globalThis.fetch).mock.calls;
    const url0 = String(calls[0][0]);

    expect(url0).toContain("/api/users");
    expect(url0).toContain("id=");
  });
});

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

describe("result shape", () => {
  it("benign attack result has correct structure", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue("user data"),
        headers: { get: () => null },
      } as unknown as Response)
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
      waf: { status: number; body: string };
      cached: boolean;
    };

    expect(data.attack).toBe("benign");
    expect(data.label).toBe("Benign request");
    expect(data.direct.status).toBe(200);
    expect(data.direct.body).toBe("user data");
    expect(data.waf.status).toBe(200);
    expect(data.cached).toBe(false);
  });
});
