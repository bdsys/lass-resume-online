# TODO

## Preview / Staging

- [ ] Fix WAF demo in preview environment — `Error: DEMO_KEY secret not configured`. Need to set `DEMO_KEY` via `wrangler secret put DEMO_KEY --env preview`.

## CI

- [ ] Update `actions/checkout` and `actions/setup-node` to Node.js 24-compatible versions before September 2026 — currently running on deprecated Node.js 20 runtime ([deprecation notice](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/))
