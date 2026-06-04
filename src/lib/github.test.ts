/**
 * Unit tests for src/lib/github.ts
 *
 * Tests the three-tier fetch strategy: KV cache → REST API → static fallback.
 * All network calls are mocked; no real HTTP is made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getGitHubUser } from "./github";

// Use a dedicated fallback name so tests can assert on it
vi.mock("../../data/github-fallback.json", () => ({
  default: {
    user: {
      login: "bdsys",
      name: "Fallback User",
      bio: "Static fallback bio",
      avatar_url: "https://example.com/avatar.png",
      html_url: "https://github.com/bdsys",
      location: "Fallback Location",
      public_repos: 5,
      followers: 1,
      following: 1,
    },
    repos: [],
    pinnedRepos: [],
  },
}));

// Helper: build a minimal valid GitHubUser
const makeUser = (name: string) => ({
  login: "bdsys",
  name,
  bio: null,
  avatar_url: "https://avatars.githubusercontent.com/u/3820695?v=4",
  html_url: "https://github.com/bdsys",
  location: null,
  public_repos: 12,
  followers: 2,
  following: 3,
});

beforeEach(() => {
  // Clean slate for every test
  vi.stubGlobal("fetch", vi.fn());
  delete (globalThis as Record<string, unknown>).GITHUB_CACHE;
  delete (globalThis as Record<string, unknown>).GITHUB_TOKEN;
  // Point at a port that nothing is listening on (fetch is mocked anyway)
  process.env.GITHUB_API_BASE = "http://localhost:0";
});

// ---------------------------------------------------------------------------
// KV cache
// ---------------------------------------------------------------------------

describe("KV cache", () => {
  it("returns cached value and skips fetch when KV hits", async () => {
    const cached = makeUser("Cached Andrew");
    (globalThis as Record<string, unknown>).GITHUB_CACHE = {
      get: vi.fn().mockResolvedValue(JSON.stringify(cached)),
      put: vi.fn(),
    };

    const result = await getGitHubUser();

    expect(result.name).toBe("Cached Andrew");
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it("calls fetch and writes KV when cache misses", async () => {
    const live = makeUser("Live Andrew");
    (globalThis as Record<string, unknown>).GITHUB_CACHE = {
      get: vi.fn().mockResolvedValue(null), // cache miss
      put: vi.fn(),
    };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(live),
    } as unknown as Response);

    const result = await getGitHubUser();

    expect(result.name).toBe("Live Andrew");
    const kv = (globalThis as Record<string, unknown>).GITHUB_CACHE as { put: ReturnType<typeof vi.fn> };
    expect(kv.put).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Static fallback
// ---------------------------------------------------------------------------

describe("static fallback", () => {
  it("uses static fallback when fetch throws a network error", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("network error"));

    const result = await getGitHubUser();

    expect(result.name).toBe("Fallback User");
  });

  it("uses static fallback when API returns non-200", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as unknown as Response);

    const result = await getGitHubUser();

    expect(result.name).toBe("Fallback User");
  });

  it("uses static fallback when API returns 500", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as unknown as Response);

    const result = await getGitHubUser();

    expect(result.name).toBe("Fallback User");
  });
});

// ---------------------------------------------------------------------------
// Auth header
// ---------------------------------------------------------------------------

describe("Authorization header", () => {
  it("sends Authorization header when GITHUB_TOKEN is set", async () => {
    (globalThis as Record<string, unknown>).GITHUB_TOKEN = "ghp_test_token_123";
    const live = makeUser("Live Andrew");
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(live),
    } as unknown as Response);

    await getGitHubUser();

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer ghp_test_token_123"
    );
  });

  it("omits Authorization header when GITHUB_TOKEN is not set", async () => {
    const live = makeUser("Live Andrew");
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue(live),
    } as unknown as Response);

    await getGitHubUser();

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });
});
