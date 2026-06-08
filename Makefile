.PHONY: build content-check version-check lint typecheck test test-smoke test-e2e test-all test-llm clean up down \
        test-waf test-waf-typecheck test-waf-smoke test-infra

DEV_PORT   ?= 3000
SMOKE_PORT ?= 3002

# ── Dev server ───────────────────────────────────────────────────────────────
# Hot-reload Turbopack dev server, backgrounded. Distinct from test-smoke which
# builds + serves the production output on SMOKE_PORT.

up:
	@bash scripts/dev.sh up $(DEV_PORT)

down:
	@bash scripts/dev.sh down $(DEV_PORT)

# ── Content ───────────────────────────────────────────────────────────────────
# Validates content/resume.yaml and regenerates src/data/resume.json.
# Run after every edit to resume.yaml. Also runs automatically before `npm run build`.

content-check:
	node scripts/content-check.mjs

version-check:
	node scripts/gen-version.mjs

# ── Individual steps ────────────────────────────────────────────────────────

build:
	npm run build

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm run test

# ── WAF demo app (waf-demo-app/) ─────────────────────────────────────────────

test-waf:
	cd waf-demo-app && npm test

test-waf-typecheck:
	cd waf-demo-app && npm run typecheck

# Builds the Docker image, starts an ephemeral container with a generated key,
# runs 7 curl checks (health, gate, XSS, SQLi, traversal, jail), stops the container.
# Requires Docker.

test-waf-smoke:
	@bash scripts/waf-smoke.sh

# ── Smoke test ───────────────────────────────────────────────────────────────
# Builds the app, starts it, curls every route, kills the server.
# No browser required — runs anywhere.
# Note: smoke.sh kills any existing process on the port before starting, to
# prevent zombie servers from silently serving stale content.

test-smoke: build
	@bash scripts/smoke.sh $(SMOKE_PORT)

# ── LLM integration test ─────────────────────────────────────────────────────
# Hits the live deployed /api/llm-compare endpoint. Requires keys set in wrangler.
# Intentionally NOT part of test-all — costs real API money and requires deployment.
# Usage: make test-llm                            (tests andrewlass.com)
#        make test-llm LLM_BASE=https://staging.andrewlass.com

LLM_BASE ?= https://andrewlass.com

test-llm:
	@bash scripts/llm-test.sh $(LLM_BASE)

# ── E2E (Playwright) ─────────────────────────────────────────────────────────
# Runs in GitHub Actions CI (ubuntu-22.04). Not supported on Ubuntu 26.04.
# On macOS or ubuntu ≤ 24.04: npx playwright install chromium, then make test-e2e

test-e2e:
	npm run test:e2e

# ── Full local gate ──────────────────────────────────────────────────────────
# content-check → typecheck → lint → unit tests → waf tests + Docker smoke → build + smoke
# Requires Docker (for test-waf-smoke). Playwright E2E is CI-only.

test-all: content-check typecheck test-waf-typecheck lint test test-waf test-waf-smoke test-infra test-smoke
	@echo ""
	@echo "✓ All local gates passed."
	@echo "  Playwright E2E runs automatically on push to dev/main (GitHub Actions)."

# ── OpenTofu infra validation ─────────────────────────────────────────────────
# Validates HCL format and configuration without needing backend credentials.
# Skips gracefully when tofu is not installed (e.g. on machines without OpenTofu).

test-infra:
	@if ! command -v tofu >/dev/null 2>&1; then \
	  echo "ℹ  tofu not found — skipping infra validation (install OpenTofu to run locally)"; \
	  exit 0; \
	fi
	tofu fmt -check -recursive infra
	cd infra && tofu init -backend=false -input=false -upgrade
	cd infra && tofu validate

# ── Utilities ────────────────────────────────────────────────────────────────

clean:
	rm -rf .next .open-next .wrangler
