import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We stub getCloudflareContext before importing the module under test.
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cfEnv, getSecret, getKV, kvGet, kvSet } from "./cf-env";

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockKV = { get: mockGet, put: mockPut };
const mockEnv = { GITHUB_CACHE: mockKV, MY_SECRET: "cf-secret-value" };

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).GITHUB_CACHE;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).MY_SECRET;
});

// ---------------------------------------------------------------------------
// cfEnv
// ---------------------------------------------------------------------------

describe("cfEnv", () => {
  it("returns env when getCloudflareContext succeeds", async () => {
    vi.mocked(getCloudflareContext).mockResolvedValue({ env: mockEnv } as never);
    expect(await cfEnv()).toBe(mockEnv);
  });

  it("returns null when getCloudflareContext throws", async () => {
    vi.mocked(getCloudflareContext).mockRejectedValue(new Error("no context"));
    expect(await cfEnv()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getSecret
// ---------------------------------------------------------------------------

describe("getSecret", () => {
  it("returns process.env value first", async () => {
    vi.mocked(getCloudflareContext).mockResolvedValue({ env: mockEnv } as never);
    process.env.MY_SECRET = "process-value";
    expect(await getSecret("MY_SECRET")).toBe("process-value");
    delete process.env.MY_SECRET;
  });

  it("falls back to cfEnv when process.env is absent", async () => {
    vi.mocked(getCloudflareContext).mockResolvedValue({ env: mockEnv } as never);
    expect(await getSecret("MY_SECRET")).toBe("cf-secret-value");
  });

  it("falls back to globalThis when both process.env and cfEnv are absent", async () => {
    vi.mocked(getCloudflareContext).mockRejectedValue(new Error("no context"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).MY_SECRET = "global-value";
    expect(await getSecret("MY_SECRET")).toBe("global-value");
  });

  it("returns undefined when secret is missing everywhere", async () => {
    vi.mocked(getCloudflareContext).mockRejectedValue(new Error("no context"));
    expect(await getSecret("NONEXISTENT_KEY")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getKV
// ---------------------------------------------------------------------------

describe("getKV", () => {
  it("returns the KV namespace from cfEnv", async () => {
    vi.mocked(getCloudflareContext).mockResolvedValue({ env: mockEnv } as never);
    expect(await getKV()).toBe(mockKV);
  });

  it("falls back to globalThis.GITHUB_CACHE", async () => {
    vi.mocked(getCloudflareContext).mockRejectedValue(new Error("no context"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).GITHUB_CACHE = mockKV;
    expect(await getKV()).toBe(mockKV);
  });

  it("returns null when KV is unavailable", async () => {
    vi.mocked(getCloudflareContext).mockRejectedValue(new Error("no context"));
    expect(await getKV()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// kvGet / kvSet
// ---------------------------------------------------------------------------

describe("kvGet", () => {
  beforeEach(() => {
    vi.mocked(getCloudflareContext).mockResolvedValue({ env: mockEnv } as never);
  });

  it("returns parsed value on hit", async () => {
    mockGet.mockResolvedValue(JSON.stringify({ foo: "bar" }));
    expect(await kvGet<{ foo: string }>("mykey")).toEqual({ foo: "bar" });
  });

  it("returns null on cache miss", async () => {
    mockGet.mockResolvedValue(null);
    expect(await kvGet("mykey")).toBeNull();
  });

  it("returns null when KV throws", async () => {
    mockGet.mockRejectedValue(new Error("kv error"));
    expect(await kvGet("mykey")).toBeNull();
  });
});

describe("kvSet", () => {
  beforeEach(() => {
    vi.mocked(getCloudflareContext).mockResolvedValue({ env: mockEnv } as never);
  });

  it("calls kv.put with serialised value and TTL", async () => {
    mockPut.mockResolvedValue(undefined);
    await kvSet("mykey", { x: 1 }, 120);
    expect(mockPut).toHaveBeenCalledWith("mykey", JSON.stringify({ x: 1 }), {
      expirationTtl: 120,
    });
  });

  it("is non-fatal when kv.put throws", async () => {
    mockPut.mockRejectedValue(new Error("put failed"));
    await expect(kvSet("mykey", { x: 1 }, 60)).resolves.toBeUndefined();
  });
});
