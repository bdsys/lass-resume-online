/**
 * GitHub API client with Cloudflare KV caching and static fallback.
 *
 * GITHUB_API_BASE     — override REST base URL (for Playwright E2E fixture server)
 * GITHUB_GRAPHQL_BASE — override GraphQL endpoint (for Playwright E2E fixture server)
 * GITHUB_TOKEN        — Worker secret; enables GraphQL pinned repos + higher rate limits
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
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
// Cloudflare bindings & secrets
// ---------------------------------------------------------------------------
//
// In the Workers runtime, bindings (KV) and secrets are exposed on
// getCloudflareContext().env — NOT on globalThis, and string secrets are not
// reliably mirrored into process.env for app code. getCloudflareContext() is
// the authoritative runtime source, so we read it directly (static import).
//
// `{ async: true }` is required for it to work in dynamic/SSR route handlers.
// Outside Workers (next dev, `next build`, Vitest) the call throws and we fall
// back to process.env (covers .env.local in dev) / globalThis (test shims).

type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

async function cfEnv(): Promise<Record<string, unknown> | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env as unknown as Record<string, unknown>;
  } catch {
    return null; // dev / next build / Vitest — no Workers context
  }
}

async function getKV(): Promise<KVNamespace | null> {
  const fromCf = (await cfEnv())?.GITHUB_CACHE as KVNamespace | undefined;
  if (fromCf) return fromCf;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((globalThis as any).GITHUB_CACHE as KVNamespace | undefined) ?? null;
}

async function getToken(): Promise<string | undefined> {
  // process.env first (dev/.env.local, tests); getCloudflareContext is the
  // reliable source in production where process.env may not carry the secret.
  const fromProcess = process.env.GITHUB_TOKEN as string | undefined;
  if (fromProcess) return fromProcess;
  const fromCf = (await cfEnv())?.GITHUB_TOKEN as string | undefined;
  if (fromCf) return fromCf;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).GITHUB_TOKEN as string | undefined;
}

async function kvGet<T>(key: string): Promise<T | null> {
  const kv = await getKV();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function kvSet<T>(key: string, value: T): Promise<void> {
  const kv = await getKV();
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

function buildHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    // GitHub rejects requests with no User-Agent (403). Don't rely on the
    // runtime's default UA, which differs between Node, Workers, and undici.
    "User-Agent": "lass-resume-online (+https://andrewlass.com)",
  };
  // Optional: set GITHUB_TOKEN Worker secret to raise rate limits
  // and unlock the GraphQL pinned repos query (see getToken()).
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

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
      headers: buildHeaders(await getToken()),
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
  if (cached && cached.length) return cached;

  try {
    const res = await fetch(
      `${apiBase()}/users/${GITHUB_LOGIN}/repos?sort=pushed&per_page=100&type=public`,
      {
        headers: buildHeaders(await getToken()),
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
  const token = await getToken();
  if (!token) {
    // Surfaced in `wrangler tail` so a missing-secret regression isn't silent.
    console.warn("[github] no GITHUB_TOKEN at runtime — pinned repos disabled");
    return [];
  }

  const cacheKey = `gh:pinned:${GITHUB_LOGIN}`;

  const cached = await kvGet<GitHubPinnedRepo[]>(cacheKey);
  if (cached && cached.length) return cached;

  try {
    const res = await fetch(graphqlBase(), {
      method:  "POST",
      headers: { ...(buildHeaders(token) as Record<string, string>), "Content-Type": "application/json" },
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
