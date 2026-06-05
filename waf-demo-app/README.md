# waf-demo-app

> **Intentionally vulnerable backend — educational WAF demonstration target.**
> Part of Phase 4 of the [lass-resume-online](https://github.com/bdsys/lass-resume-online) portfolio.

---

## What this is

An isolated Node.js/Express service with three genuinely exploitable endpoints. It exists so that
the portfolio's Phase 5 Cloudflare WAF can demonstrate blocking real attacks in real time.

All "sensitive" data is planted fake content. The app has no database persistence, no shared
secrets with the main portfolio, and no access to real infrastructure.

## Endpoints

| Endpoint | Vulnerability | Example exploit |
|---|---|---|
| `GET /api/echo?msg=…` | Reflected XSS | `?msg=<script>alert(1)</script>` |
| `GET /api/users?id=…` | SQL Injection | `?id=1' OR '1'='1` |
| `GET /api/file?name=…` | Path Traversal | `?name=subdir/../secret-flag.txt` |
| `GET /healthz` | — | Fly.io health check |
| `GET /` | — | This explainer page |

All `/api/*` endpoints require the `X-Demo-Key` header (see [Soft gate](#soft-gate)).

## Isolation guarantees

- **No persistence**: SQLite runs in `:memory:` — all data dies with the process
- **No real secrets**: demo files contain planted dummy content only
- **No shared infra**: separate Fly.io app, zero access to main portfolio
- **Sandbox jail**: path traversal is jailed to `demo-files/` — cannot read container files
- **Rate limited**: 60 requests / 5-minute window per IP

## Soft gate

Until the Phase 5 Cloudflare WAF is in place, `/api/*` endpoints require:

```
X-Demo-Key: <DEMO_KEY>
```

Without the correct key, every `/api` request returns `423 Locked`. The Phase 5 Cloudflare
Worker injects the key automatically, so the public exploit surface is closed until then.

## Local dev

```bash
cd waf-demo-app
npm install
DEMO_KEY=test npm run dev        # tsx watch, hot-reload
```

Test an endpoint:
```bash
curl -H "X-Demo-Key: test" "http://localhost:8080/api/users?id=1' OR '1'='1"
```

## Tests

```bash
cd waf-demo-app
npm test            # Vitest (Node env, forks pool)
npm run typecheck   # tsc --noEmit
```

## Build

```bash
npm run build       # tsc → dist/
```

## Docker

```bash
# Build
docker build -t waf-demo .

# Run (supply your DEMO_KEY)
docker run --rm -e DEMO_KEY=test -p 8080:8080 waf-demo

# Smoke test
curl http://localhost:8080/healthz
curl -H "X-Demo-Key: test" "http://localhost:8080/api/echo?msg=<script>alert(1)</script>"
```

## Fly.io deployment

The app is deployed to `lass-waf-demo.fly.dev`.

```bash
# First time
flyctl apps create --name lass-waf-demo
flyctl secrets set DEMO_KEY=$(openssl rand -hex 32) --app lass-waf-demo

# Deploy
flyctl deploy

# Verify
flyctl status --app lass-waf-demo
curl https://lass-waf-demo.fly.dev/healthz
```

> Record the `DEMO_KEY` value — Phase 5 needs it to configure the Cloudflare Worker.

## Phase context

| Phase | Work |
|---|---|
| 2 ✅ | Live GitHub portfolio |
| 3 ✅ | Resume page |
| **4 ✅** | **This app — isolated vulnerable backend** |
| 5 | Cloudflare WAF rules + `/security` dashboard (needs custom domain) |
