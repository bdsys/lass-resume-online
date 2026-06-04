/**
 * GitHub API client with Cloudflare KV caching and static fallback.
 *
 * Phase 1: user profile only (REST)
 * Phase 2: repos + GraphQL pinned repos (added in that phase)
 *
 * GITHUB_API_BASE — override the REST base URL (used by Playwright E2E to point
 * at a local fixture mock server instead of the real GitHub API).
 * Defaults to https://api.github.com.
 */

import fallback from "../../data/github-fallback.json";

const GITHUB_LOGIN = "bdsys";
const CACHE_TTL_SECONDS = 3600; // 1 hour

/** Base URL for REST API — overridable for testing */
function apiBase(): string {
  return process.env.GITHUB_API_BASE ?? "https://api.github.com";
}

export interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

// ---------------------------------------------------------------------------
// KV cache helpers (only available in Workers runtime)
// ---------------------------------------------------------------------------

type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

function getKV(): KVNamespace | null {
  // GITHUB_CACHE is bound in wrangler.toml; not available in local Next.js dev
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).GITHUB_CACHE ?? null;
}

async function kvGet<T>(key: string): Promise<T | null> {
  const kv = getKV();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function kvSet<T>(key: string, value: T): Promise<void> {
  const kv = getKV();
  if (!kv) return;
  try {
    await kv.put(key, JSON.stringify(value), { expirationTtl: CACHE_TTL_SECONDS });
  } catch {
    // Non-fatal — continue without caching
  }
}

// ---------------------------------------------------------------------------
// REST helpers
// ---------------------------------------------------------------------------

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  // Optional: set GITHUB_TOKEN Worker secret to raise rate limits
  // and unlock GraphQL pinned repos query (Phase 2)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = (globalThis as any).GITHUB_TOKEN as string | undefined;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the GitHub user profile for bdsys.
 * Tries KV cache → GitHub REST → static fallback, in that order.
 */
export async function getGitHubUser(): Promise<GitHubUser> {
  const cacheKey = `gh:user:${GITHUB_LOGIN}`;

  // 1. KV cache
  const cached = await kvGet<GitHubUser>(cacheKey);
  if (cached) return cached;

  // 2. GitHub REST API
  try {
    const res = await fetch(`${apiBase()}/users/${GITHUB_LOGIN}`, {
      headers: buildHeaders(),
      // Next.js cache: revalidate once per hour on the CDN / server side too
      next: { revalidate: CACHE_TTL_SECONDS },
    });

    if (res.ok) {
      const user = (await res.json()) as GitHubUser;
      await kvSet(cacheKey, user);
      return user;
    }
  } catch {
    // Fall through to static fallback
  }

  // 3. Static fallback
  return fallback.user as GitHubUser;
}
