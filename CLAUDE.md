# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Dev
make up                  # Start Turbopack hot-reload dev server on :3000 (backgrounded)
make down                # Stop the dev server

# Content
make content-check       # Validate content/resume.yaml → regenerate src/data/resume.json
                         # Must run after every edit to resume.yaml

# Quality gate (run before pushing)
make typecheck           # tsc --noEmit
make lint                # eslint
make test                # Vitest unit tests (jsdom, no browser)
make test-smoke          # Build + curl every route (no browser required)
make test-all            # content-check → typecheck → lint → unit → smoke

# Run a single Vitest test file
npx vitest run src/lib/github.test.ts

# E2E (Playwright — CI-only on ubuntu-22.04; not supported on Ubuntu 26.04)
make test-e2e            # Playwright against the built app
# If on a supported OS: npx playwright install chromium first

# Cloudflare deployment
npm run build:worker     # OpenNext Cloudflare build → .open-next/
npm run preview          # Run local Workerd (Workers runtime) preview
npm run deploy           # Deploy to Cloudflare Workers
make clean               # rm -rf .next .open-next .wrangler
```

## Architecture

### Hosting & runtime

Next.js 16 App Router deployed to **Cloudflare Workers** via `@opennextjs/cloudflare`. The build has two forms: `npm run build` (standard Next.js, used for local dev/smoke) and `npm run build:worker` (OpenNext Cloudflare build for deployment). Config lives in `open-next.config.ts` and `wrangler.toml`.

### Data flow

Three layers, in priority order for every GitHub fetch:

1. **Cloudflare KV** (`GITHUB_CACHE` binding, 1-hour TTL) — only available in Workers runtime
2. **GitHub REST/GraphQL API** — requires `GITHUB_TOKEN` secret for GraphQL (pinned repos) and higher rate limits
3. **Static fallback** — `data/github-fallback.json` committed to the repo

The KV binding is accessed via `globalThis.GITHUB_CACHE`; it is `null` during local `next dev`, so the app always falls through to live API or static fallback in dev. `src/lib/github.ts` owns all of this.

### Resume content pipeline

**Source of truth:** `content/resume.yaml`
**Generated copy:** `src/data/resume.json` (produced by `make content-check` / `scripts/content-check.mjs`)

The flow: edit YAML → `make content-check` validates and writes JSON → `src/lib/resume.ts` imports the JSON at build time, parses it through a Zod schema, and returns typed `Resume` objects. The loader throws a descriptive error if `resume.json` is stale or invalid. `npm run build` runs `content-check` automatically via the `prebuild` hook.

### Styling

Tailwind CSS v4 with custom CSS variables defined in `src/app/globals.css`. All color/spacing tokens are referenced as `var(--color-*)` — never hardcode hex values. Dark mode is the default.

### Test strategy

- **Vitest** (`npm run test`): unit tests co-located with source (`src/**/*.test.ts(x)`). Runs in jsdom. Path aliases resolved via `vite-tsconfig-paths`.
- **Playwright** (`npm run test:e2e`): E2E tests in `tests/e2e/`. Uses a fixture mock server (`tests/fixtures/mock-server.ts`) to intercept GitHub API calls. Only runs in CI (ubuntu-22.04).
- **Smoke** (`make test-smoke`): builds the app and curls every route. No browser; works anywhere.

### CI

GitHub Actions runs four independent test workflows on push/PR to `main` and `dev`, each with its own status badge: `quality.yml` (lint → typecheck → Vitest), `waf.yml` (waf-demo-app typecheck → unit tests → Docker smoke), `infra.yml` (OpenTofu fmt + validate), and `e2e.yml` (Playwright on ubuntu-22.04). They run in parallel — there is no cross-workflow gate. E2E is CI-only.

Deploys are automated by `deploy.yml`: on push to `main` (or manual `workflow_dispatch`), it gates on lint/typecheck/unit tests, then runs `npm run build:worker` and `npm run deploy`. Wrangler authenticates via the `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets. Note `opennextjs-cloudflare deploy` does not build — the workflow builds first. Runtime Worker secrets (`GITHUB_TOKEN`, `DEMO_KEY`) are set via `wrangler secret put` and persist across deploys, so they are not in CI.

### Path aliases

`@/` maps to `src/` (configured in `tsconfig.json` and `vitest.config.ts` via `vite-tsconfig-paths`).

### Environment variables / secrets

| Name | Where set | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | `wrangler secret` / `.env.local` | GraphQL pinned repos + rate limits |
| `ANTHROPIC_API_KEY` | `wrangler secret` / `.env.local` | Claude Haiku calls in `/api/llm-compare` |
| `GOOGLE_API_KEY` | `wrangler secret` / `.env.local` | Gemini Flash calls in `/api/llm-compare` |
| `GITHUB_API_BASE` | test env | Override REST base URL (E2E fixture server) |
| `GITHUB_GRAPHQL_BASE` | test env | Override GraphQL endpoint (E2E fixture server) |
| `GITHUB_CACHE` | `wrangler.toml` KV binding | KV namespace for API cache + rate-limit counters |
