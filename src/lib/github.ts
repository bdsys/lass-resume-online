/**
 * GitHub API client with Cloudflare KV caching and static fallback.
 *
 * GITHUB_API_BASE     — override REST base URL (for Playwright E2E fixture server)
 * GITHUB_GRAPHQL_BASE — override GraphQL endpoint (for Playwright E2E fixture server)
 * GITHUB_TOKEN        — Worker secret; enables GraphQL pinned repos + higher rate limits
 */

import fallback from "../../data/github-fallback.json";

const GITHUB_LOGIN = "bdsys";
const CACHE_TTL_SECONDS = 3600; // 1 hour

function apiBase(): string {
  return process.env.GITHUB_API_BASE ?? "https://api.github.com";
}

function graphqlBase(): string {
  return process.env.GITHUB_GRAPHQL_BASE ?? "https://api.github.com/graphql";
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  topics: string[];
}

export interface GitHubPinnedRepo {
  name: string;
  description: string | null;
  url: string;
  primaryLanguage: { name: string; color: string } | null;
  stargazerCount: number;
  pushedAt: string;
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
  // Workers expose secrets on globalThis; Next.js dev reads from process.env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = ((globalThis as any).GITHUB_TOKEN ?? process.env.GITHUB_TOKEN) as string | undefined;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the GitHub user profile for bdsys.
 * KV cache → GitHub REST → static fallback.
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

/**
 * Fetch public repos for bdsys, sorted by most recently pushed.
 * KV cache → GitHub REST → static fallback.
 */
export async function getRepositories(): Promise<GitHubRepo[]> {
  const cacheKey = `gh:repos:${GITHUB_LOGIN}`;

  const cached = await kvGet<GitHubRepo[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${apiBase()}/users/${GITHUB_LOGIN}/repos?sort=pushed&per_page=100&type=public`,
      {
        headers: buildHeaders(),
        next: { revalidate: CACHE_TTL_SECONDS },
      },
    );
    if (res.ok) {
      const raw = (await res.json()) as GitHubRepo[];
      // Only keep the fields we use to avoid caching the full API response
      const repos: GitHubRepo[] = raw.map(r => ({
        name:             r.name,
        description:      r.description,
        html_url:         r.html_url,
        homepage:         r.homepage,
        language:         r.language,
        stargazers_count: r.stargazers_count,
        pushed_at:        r.pushed_at,
        topics:           r.topics ?? [],
      }));
      await kvSet(cacheKey, repos);
      return repos;
    }
  } catch {
    // Fall through to static fallback
  }

  return fallback.repos as GitHubRepo[];
}

const PINNED_QUERY = `{
  user(login: "${GITHUB_LOGIN}") {
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          description
          url
          primaryLanguage { name color }
          stargazerCount
          pushedAt
        }
      }
    }
  }
}`;

/**
 * Fetch pinned repos via GraphQL. Requires GITHUB_TOKEN; returns [] without one.
 * KV cache → GitHub GraphQL → [].
 */
export async function getPinnedRepos(): Promise<GitHubPinnedRepo[]> {
  // Workers expose secrets on globalThis; Next.js dev reads from process.env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = ((globalThis as any).GITHUB_TOKEN ?? process.env.GITHUB_TOKEN) as string | undefined;
  if (!token) return [];

  const cacheKey = `gh:pinned:${GITHUB_LOGIN}`;

  const cached = await kvGet<GitHubPinnedRepo[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(graphqlBase(), {
      method:  "POST",
      headers: { ...(buildHeaders() as Record<string, string>), "Content-Type": "application/json" },
      body:    JSON.stringify({ query: PINNED_QUERY }),
      next:    { revalidate: CACHE_TTL_SECONDS },
    });
    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as any;
      const nodes: GitHubPinnedRepo[] = data?.data?.user?.pinnedItems?.nodes ?? [];
      await kvSet(cacheKey, nodes);
      return nodes;
    }
  } catch {
    // No pinned repos available
  }

  return [];
}
