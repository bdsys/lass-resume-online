# ADR-001: Portfolio Site Architecture

**Date:** 2026-06-04  
**Status:** Accepted  
**Author:** Andrew Lass

---

## Context

Building a personal developer/security portfolio to show to hiring managers. The site needs to:
- Look polished and professional
- Pull live data from the GitHub API
- Render a resume from a single source of truth
- Feature an educational WAF demo that looks like a real security dashboard

---

## Decisions

### 1. Hosting: Cloudflare Workers + OpenNext adapter

**Chosen:** `@opennextjs/cloudflare` (Workers)  
**Rejected:** `@cloudflare/next-on-pages` (Pages)

**Reasoning:** As of 2026, OpenNext is the Cloudflare/Next.js team's recommended path for
deploying Next.js App Router to Cloudflare. It runs the full Node.js runtime, supports ISR,
streaming, React Cache Components, and provides native KV/Durable Object bindings. The older
`next-on-pages` adapter only supports the Edge runtime and breaks with modern Next.js features.

Workers with Wrangler gives full control over bindings (KV, secrets) while still supporting
Git-push CI/CD through GitHub Actions.

### 2. Caching: Cloudflare KV

GitHub API responses are cached in Cloudflare KV with a 1-hour TTL. This prevents rate-limit
hits on popular pages, ensures fast response times globally, and provides a buffer when the
GitHub API has downtime. A committed `data/github-fallback.json` provides a third safety net.

### 3. WAF demo: Real Cloudflare WAF + isolated Fly.io container

**Chosen:** Real CF WAF rules in front of a separately deployed vulnerable app  
**Rejected:** Simulated WAF (Worker mocking 403 responses)

**Reasoning:** The WAF demo is a centerpiece that should be demonstrably real to hiring managers
and security practitioners. A simulated WAF can be dismissed; a real Cloudflare WAF with actual
CF-Ray-ID headers, real 403 block responses, and a real separate origin is verifiably authentic.

**Isolation guarantee:** The vulnerable app:
- Runs in a dedicated Fly.io application (no shared infrastructure with portfolio)
- Has zero secrets, no persistent state, no database
- Accepts only requests proxied through Cloudflare (Fly.io firewall allows only CF IPs; documented separately)
- Is rate-limited at the application layer
- Contains prominent headers and UI banners: `X-Demo-Notice: Intentionally Vulnerable — Educational`

See `docs/waf-isolation.md` for the full boundary diagram.

### 4. Resume: Structured JSON → HTML + build-time PDF

A single `content/resume.json` is the source of truth. The `/resume` route renders typeset HTML
from that JSON. A Playwright build step renders that HTML to `public/AndrewLass-Resume.pdf` at
build time, ensuring the PDF is always in sync. Editing `resume.json` and rebuilding regenerates
everything.

### 5. Tech stack summary

| Layer          | Choice                                        |
|----------------|-----------------------------------------------|
| Frontend       | Next.js 16+ (App Router, TypeScript)          |
| Styling        | Tailwind CSS v4 + custom CSS variables        |
| Components     | shadcn/ui (added in later phases as needed)   |
| Hosting        | Cloudflare Workers via OpenNext adapter       |
| Edge functions | Cloudflare Workers (same deployment)          |
| Caching        | Cloudflare KV                                 |
| WAF            | Cloudflare WAF custom rules                   |
| Demo backend   | Fly.io (Docker, remote builder)               |
| Resume source  | `content/resume.json` (from 5-2025 resume)    |

---

## Consequences

- **Positive:** Full-stack on the same Workers runtime; KV binding just works; no separate API server.
- **Positive:** Real WAF demo is verifiably authentic.
- **Tradeoff:** Need a custom domain proxied through Cloudflare for real WAF rules (`.workers.dev` does not support CF WAF). Domain selection is a prerequisite for Phase 5.
- **Tradeoff:** `flyctl` must be installed for Phase 4; Fly.io account required.
- **Tradeoff:** PDF generation requires Playwright as a build-time dependency (adds ~300MB to build image). Acceptable for a build step.
