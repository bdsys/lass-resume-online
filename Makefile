.PHONY: build content-check lint typecheck test test-smoke test-e2e test-all clean

SMOKE_PORT ?= 3002

# ── Content ───────────────────────────────────────────────────────────────────
# Validates content/resume.yaml and regenerates src/data/resume.json.
# Run after every edit to resume.yaml. Also runs automatically before `npm run build`.

content-check:
	node scripts/content-check.mjs

# ── Individual steps ────────────────────────────────────────────────────────

build:
	npm run build

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm run test

# ── Smoke test ───────────────────────────────────────────────────────────────
# Builds the app, starts it, curls every route, kills the server.
# No browser required — runs anywhere.
# Note: smoke.sh kills any existing process on the port before starting, to
# prevent zombie servers from silently serving stale content.

test-smoke: build
	@bash scripts/smoke.sh $(SMOKE_PORT)

# ── E2E (Playwright) ─────────────────────────────────────────────────────────
# Runs in GitHub Actions CI (ubuntu-22.04). Not supported on Ubuntu 26.04.
# On macOS or ubuntu ≤ 24.04: npx playwright install chromium, then make test-e2e

test-e2e:
	npm run test:e2e

# ── Full local gate ──────────────────────────────────────────────────────────
# content-check → typecheck → lint → unit tests → build + smoke
# Playwright E2E is CI-only; push to dev/main to run it.

test-all: content-check typecheck lint test test-smoke
	@echo ""
	@echo "✓ All local gates passed."
	@echo "  Playwright E2E runs automatically on push to dev/main (GitHub Actions)."

# ── Utilities ────────────────────────────────────────────────────────────────

clean:
	rm -rf .next .open-next .wrangler
