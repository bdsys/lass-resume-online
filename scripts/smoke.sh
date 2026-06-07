#!/usr/bin/env bash
# Smoke test: start the built Next.js app, curl every route, verify 200 + key content.
# Usage: bash scripts/smoke.sh [port]  (default 3002)
set -euo pipefail

PORT=${1:-3002}
BASE="http://localhost:${PORT}"
PASS=0
FAIL=0

# ── Start server ─────────────────────────────────────────────────────────────
# Kill any existing process on this port so we don't silently test stale content.
# ss -tlnp is reliable in WSL; lsof does not consistently detect listening sockets.
if ss -tlnp 2>/dev/null | grep -q ":${PORT}[[:space:]]"; then
  echo "Warning: killing existing process on port $PORT before starting test server."
  ss -tlnp 2>/dev/null | grep ":${PORT}[[:space:]]" | grep -oP 'pid=\K[0-9]+' | xargs kill -9 2>/dev/null || true
  # Wait up to 5s for the port to be fully released
  for i in $(seq 1 5); do
    sleep 1
    ss -tlnp 2>/dev/null | grep -q ":${PORT}[[:space:]]" || break
    echo "  Waiting for port $PORT to be released (${i}s)..."
  done
fi

npm run start -- -p "$PORT" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  rm -f /tmp/smoke_body_$$
}
trap cleanup EXIT

# ── Wait for ready (up to 30s) ───────────────────────────────────────────────
echo "Waiting for server on port $PORT..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" -H "Cache-Control: no-cache" "$BASE/" 2>/dev/null | grep -q "200"; then
    echo "Server ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: server did not become ready within 30s"
    exit 1
  fi
  sleep 1
done

# ── Helpers ───────────────────────────────────────────────────────────────────
check() {
  local path="$1"
  local expect="$2"
  local url="${BASE}${path}"

  # Cache-Control: no-cache forces Next.js ISR to serve fresh content rather
  # than the stale pre-rendered cache that can persist across incremental builds.
  STATUS=$(curl -s -o /tmp/smoke_body_$$ -w "%{http_code}" \
    -H "Cache-Control: no-cache" "$url")

  if [ "$STATUS" != "200" ]; then
    echo "  FAIL  ${path}  — expected 200, got ${STATUS}"
    FAIL=$((FAIL + 1))
    return
  fi

  if ! grep -qi "$expect" /tmp/smoke_body_$$; then
    echo "  FAIL  ${path}  — 200 OK but '${expect}' not found in response"
    FAIL=$((FAIL + 1))
    return
  fi

  echo "  PASS  ${path}  — 200 OK  \"${expect}\""
  PASS=$((PASS + 1))
}

# ── Run checks ────────────────────────────────────────────────────────────────
echo ""
echo "Smoke tests → ${BASE}"
echo "────────────────────────────────────────────────────"

# Homepage: core identity and content sections
check "/"           "Andrew Lass"
check "/"           "Senior Cloud Security"
check "/"           "Cloud Security"
check "/"           "Networking"
check "/"           "Governance"
check "/"           "bdsys@portfolio"

# Portfolio: live repo data (API or fallback both include lass-resume-online)
check "/portfolio"  "bdsys"
check "/portfolio"  "lass-resume-online"

# Stub routes — must return 200 (no 404/500)
check "/resume"     "Resume"
check "/security"   "WAF Demo"
check "/tools"      "Tools"

# IP API — plain-text response
check "/api/ip"     "."

echo "────────────────────────────────────────────────────"
echo "${PASS} passed, ${FAIL} failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
