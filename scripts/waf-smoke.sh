#!/usr/bin/env bash
# WAF demo smoke test: build the Docker image, start an ephemeral container,
# exercise every curl case, then stop the container.
# Usage: bash scripts/waf-smoke.sh
# Requires: Docker, openssl
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

WAF_PORT=${WAF_SMOKE_PORT:-8082}
DEMO_KEY=$(openssl rand -hex 32)
CONTAINER="waf-demo-smoke-$$"
BASE="http://localhost:${WAF_PORT}"
TMP="/tmp/waf_smoke_body_$$"
PASS=0
FAIL=0

# ── Build image ───────────────────────────────────────────────────────────────

echo "==> Building waf-demo Docker image..."
docker build -q -t waf-demo "${REPO_ROOT}/waf-demo-app"

# ── Start container ───────────────────────────────────────────────────────────

echo "==> Starting container on :${WAF_PORT}..."
docker run -d --rm \
  -e DEMO_KEY="$DEMO_KEY" \
  -p "${WAF_PORT}:8080" \
  --name "$CONTAINER" \
  waf-demo

cleanup() {
  docker stop "$CONTAINER" 2>/dev/null || true
  rm -f "$TMP"
}
trap cleanup EXIT

# ── Wait for ready (up to 15s) ────────────────────────────────────────────────

echo "Waiting for waf-demo on port ${WAF_PORT}..."
for i in $(seq 1 15); do
  curl -sf "${BASE}/healthz" > /dev/null 2>&1 && break
  [ "$i" -lt 15 ] || { echo "ERROR: container did not become ready within 15s"; exit 1; }
  sleep 1
done
echo "Container ready."

# ── Helpers ───────────────────────────────────────────────────────────────────

pass() { echo "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL  $1"; FAIL=$((FAIL + 1)); }

# check_status <label> <url> <expected-http-status> [extra curl args...]
check_status() {
  local label="$1" url="$2" expected="$3"; shift 3
  local got; got=$(curl -s -o "$TMP" -w "%{http_code}" "$@" "$url")
  [ "$got" = "$expected" ] \
    && pass "${label} — HTTP ${got}" \
    || fail "${label} — expected ${expected}, got ${got}"
}

# check_body <label> <url> <grep-pattern> [extra curl args...]
check_body() {
  local label="$1" url="$2" pattern="$3"; shift 3
  curl -sf -o "$TMP" "$@" "$url"
  grep -q "$pattern" "$TMP" \
    && pass "${label} — body contains '${pattern}'" \
    || fail "${label} — body does not contain '${pattern}'"
}

# ── Run checks ────────────────────────────────────────────────────────────────

KEY=(-H "X-Demo-Key: ${DEMO_KEY}")

echo ""
echo "WAF demo smoke tests → ${BASE}"
echo "────────────────────────────────────────────────────"

# Gate-exempt routes (no key needed)
check_status "GET /healthz"         "${BASE}/healthz" "200"
check_status "GET / (no key)"       "${BASE}/"        "200"

# Gate: closed to the public without key
check_status "Gate 423 (no key)"    "${BASE}/api/users?id=1" "423"

# XSS: <script> is reflected verbatim, not escaped
check_body "XSS: <script> reflected" \
  "${BASE}/api/echo?msg=%3Cscript%3Ealert%281%29%3C%2Fscript%3E" \
  "<script>" "${KEY[@]}"

# SQLi: OR 1=1 payload should dump more than one row
check_body "SQLi: OR injection returns all rows" \
  "${BASE}/api/users?id=1%27+OR+%271%27%3D%271" \
  '"role"' "${KEY[@]}"

# Path traversal: subdir/../secret-flag.txt reaches the planted secret
check_body "Traversal: secret-flag.txt reachable via ../" \
  "${BASE}/api/file?name=subdir%2F..%2Fsecret-flag.txt" \
  "FLAG" "${KEY[@]}"

# Jail: traversal outside sandbox root must be blocked
check_status "Jail: ../../etc/passwd → 403" \
  "${BASE}/api/file?name=..%2F..%2Fetc%2Fpasswd" \
  "403" "${KEY[@]}"

# ── Summary ───────────────────────────────────────────────────────────────────

echo "────────────────────────────────────────────────────"
echo "${PASS} passed, ${FAIL} failed"
echo ""

[ "$FAIL" -eq 0 ] || exit 1
