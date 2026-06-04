# lass-resume-online

Personal developer/security portfolio for Andrew Lass — Senior SRE & Cloud Security Engineer.

**Live site:** <!-- TODO: backfill with production URL after domain is configured -->

---

## What's here

| Route       | Description                                                   | Phase |
|-------------|---------------------------------------------------------------|-------|
| `/`         | Bio/about from live GitHub API, terminal intro, skills        | 1 ✅   |
| `/portfolio`| GitHub repos via REST + GraphQL, KV-cached, topic-categorized | 2     |
| `/resume`   | Typeset resume from `content/resume.json` + PDF download      | 3     |
| `/security` | Live WAF demo — Cloudflare WAF blocks attacks on Fly.io app   | 5     |

---

## Tech stack

| Layer          | Choice                                           |
|----------------|--------------------------------------------------|
| Frontend       | Next.js 16+ (App Router, TypeScript)             |
| Styling        | Tailwind CSS v4 + custom dark theme              |
| Hosting        | Cloudflare Workers via `@opennextjs/cloudflare`  |
| Caching        | Cloudflare KV (`GITHUB_CACHE` binding)           |
| WAF            | Cloudflare WAF custom rules                      |
| Demo backend   | Fly.io (isolated vulnerable Express container)   |
| Resume source  | `content/resume.json`                            |

---

## Development

```bash
npm install
npm run dev          # Next.js local dev server (localhost:3000)
npm run build        # Standard Next.js build
npm run build:worker # OpenNext Cloudflare build (.open-next/)
npm run preview      # Preview on local Workerd runtime
npm run deploy       # Deploy to Cloudflare Workers
```

---

## First-time setup

### 1. Cloudflare account + Wrangler login

```bash
npx wrangler login
```

### 2. Create KV namespace for GitHub API cache

```bash
npx wrangler kv namespace create GITHUB_CACHE
# Copy the id from the output and paste it into wrangler.toml
```

Edit `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "GITHUB_CACHE"
id = "PASTE_YOUR_KV_ID_HERE"
```

### 3. (Optional) GitHub token secret for GraphQL + higher rate limits

```bash
npx wrangler secret put GITHUB_TOKEN
# Enter a fine-grained token with public repo read access
```

### 4. Custom domain (required for Phase 5 WAF demo)

Add your domain to Cloudflare with DNS proxied (orange cloud). Set `routes` in `wrangler.toml`:
```toml
routes = [{ pattern = "yourdomain.com/*", zone_name = "yourdomain.com" }]
```

<!-- TODO: backfill with actual domain name -->

---

## Deployment

```bash
npm run build:worker   # Build with OpenNext Cloudflare adapter
npm run deploy         # Deploy to Cloudflare Workers
```

CI/CD via GitHub Actions is recommended. <!-- TODO: add workflow file in Phase 6 -->

---

## WAF demo setup (Phase 4–5)

See `docs/waf-isolation.md` for the full isolation architecture and deployment instructions.

<!-- TODO: backfill with Fly.io app URL after Phase 4 -->

---

## Repository structure

```
assets/          # Resume source .md files + achievement report
content/         # Site content (about.md, resume.json)
data/            # Static fallbacks (github-fallback.json)
docs/            # Architecture decisions, topic schema, deployment, WAF isolation
src/app/         # Next.js App Router (pages)
src/components/  # Shared UI components
src/lib/         # GitHub API client, utilities
public/          # Static assets (PDF resume)
waf-demo-app/    # Isolated vulnerable backend (Phase 4)
infra/           # Cloudflare WAF rules as Terraform (Phase 5)
wrangler.toml    # Cloudflare Workers config
open-next.config.ts
```

---

## License

MIT
