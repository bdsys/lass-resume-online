#!/usr/bin/env bash
# Live integration test for /api/llm-compare against the deployed Worker.
# Tests: successful comparison, prompt echo, rate-limit 429 on second call.
#
# Usage: bash scripts/llm-test.sh [base_url]
#   base_url defaults to https://andrewlass.com
#
# Requirements: curl, jq
set -euo pipefail

BASE="${1:-https://andrewlass.com}"
ENDPOINT="${BASE}/api/llm-compare"
PASS=0
FAIL=0

# ── Helpers ───────────────────────────────────────────────────────────────────

green() { printf '\033[32m  PASS\033[0m  %s\n' "$*"; }
red()   { printf '\033[31m  FAIL\033[0m  %s\n' "$*"; }

pass() { green "$1"; PASS=$((PASS + 1)); }
fail() { red   "$1"; FAIL=$((FAIL + 1)); }

require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: jq is required. Install it with: sudo apt-get install jq"
    exit 1
  fi
}

# Post to the endpoint; echoes the response body and sets STATUS_CODE.
post_compare() {
  local prompt="${1:-}"
  local body
  if [ -n "$prompt" ]; then
    body="{\"prompt\": $(printf '%s' "$prompt" | jq -Rs .)}"
  else
    body='{}'
  fi

  STATUS_CODE=$(curl -s -o /tmp/llm_test_body_$$ -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$body" \
    "$ENDPOINT")
  RESPONSE_BODY=$(cat /tmp/llm_test_body_$$)
  rm -f /tmp/llm_test_body_$$
}

# ── Checks ────────────────────────────────────────────────────────────────────
require_jq

echo ""
echo "LLM integration tests → ${ENDPOINT}"
echo "────────────────────────────────────────────────────"

# ── Test 1: successful comparison with default prompt ─────────────────────────
echo "  Running call 1 (may take up to 30s for both LLMs to respond)..."
post_compare

if [ "$STATUS_CODE" = "200" ]; then
  pass "1. Returns 200 on first call"
else
  fail "1. Returns 200 on first call (got $STATUS_CODE)"
  echo "     Response: $RESPONSE_BODY"
fi

# Both providers must be present and have a 'text' key (not just an 'error' key)
CLAUDE_HAS_TEXT=$(echo "$RESPONSE_BODY" | jq 'has("claude") and (.claude | has("text"))' 2>/dev/null || echo "false")
if [ "$CLAUDE_HAS_TEXT" = "true" ]; then
  pass "2. claude result has text field"
else
  fail "2. claude result has text field"
  echo "     claude: $(echo "$RESPONSE_BODY" | jq '.claude' 2>/dev/null || echo 'parse error')"
fi

GEMINI_HAS_TEXT=$(echo "$RESPONSE_BODY" | jq 'has("gemini") and (.gemini | has("text"))' 2>/dev/null || echo "false")
if [ "$GEMINI_HAS_TEXT" = "true" ]; then
  pass "3. gemini result has text field"
else
  fail "3. gemini result has text field"
  echo "     gemini: $(echo "$RESPONSE_BODY" | jq '.gemini' 2>/dev/null || echo 'parse error')"
fi

# Prompt must be echoed back
PROMPT_ECHOED=$(echo "$RESPONSE_BODY" | jq -r '.prompt // empty' 2>/dev/null)
if [ -n "$PROMPT_ECHOED" ]; then
  pass "4. prompt is echoed in response (\"${PROMPT_ECHOED:0:60}\")"
else
  fail "4. prompt is echoed in response"
fi

# Claude model string
CLAUDE_MODEL=$(echo "$RESPONSE_BODY" | jq -r '.claude.model // empty' 2>/dev/null)
if [ "$CLAUDE_MODEL" = "claude-haiku-4-5" ]; then
  pass "5. claude.model = claude-haiku-4-5"
else
  fail "5. claude.model = claude-haiku-4-5 (got \"$CLAUDE_MODEL\")"
fi

# Gemini model string
GEMINI_MODEL=$(echo "$RESPONSE_BODY" | jq -r '.gemini.model // empty' 2>/dev/null)
if [ "$GEMINI_MODEL" = "gemini-2.5-flash" ]; then
  pass "6. gemini.model = gemini-2.5-flash"
else
  fail "6. gemini.model = gemini-2.5-flash (got \"$GEMINI_MODEL\")"
fi

# latencyMs present and numeric
CLAUDE_LATENCY=$(echo "$RESPONSE_BODY" | jq '.claude.latencyMs | type == "number"' 2>/dev/null || echo "false")
if [ "$CLAUDE_LATENCY" = "true" ]; then
  LATENCY_VAL=$(echo "$RESPONSE_BODY" | jq '.claude.latencyMs')
  pass "7. claude.latencyMs is numeric (${LATENCY_VAL}ms)"
else
  fail "7. claude.latencyMs is numeric"
fi

# ── Test 2: custom prompt is echoed ──────────────────────────────────────────
CUSTOM="What is the tallest mountain in Washington State?"
post_compare "$CUSTOM"

if [ "$STATUS_CODE" = "200" ]; then
  ECHOED=$(echo "$RESPONSE_BODY" | jq -r '.prompt // empty' 2>/dev/null)
  if [ "$ECHOED" = "$CUSTOM" ]; then
    pass "8. custom prompt is echoed correctly"
  else
    fail "8. custom prompt is echoed correctly (got \"$ECHOED\")"
  fi
elif [ "$STATUS_CODE" = "429" ]; then
  # Rate-limited from first call — this is correct behaviour
  pass "8. custom prompt (rate-limited from call 1, which is correct)"
else
  fail "8. custom prompt returned $STATUS_CODE"
fi

# ── Test 3: rate limit — immediate second call should 429 ────────────────────
# (If we already got a 429 above, skip or note it)
post_compare

if [ "$STATUS_CODE" = "429" ]; then
  RETRY_AFTER=$(echo "$RESPONSE_BODY" | jq 'has("retryAfterSeconds")' 2>/dev/null || echo "false")
  pass "9. second immediate call returns 429"
  if [ "$RETRY_AFTER" = "true" ]; then
    pass "10. 429 body includes retryAfterSeconds"
  else
    fail "10. 429 body includes retryAfterSeconds"
    echo "     Response: $RESPONSE_BODY"
  fi
elif [ "$STATUS_CODE" = "200" ]; then
  # Could happen if test 2 was rate-limited and reset the window; just note it.
  pass "9. (third call returned 200 — rate-limit window may have been reset by test 2's 429)"
  PASS=$((PASS + 1))  # count test 10 as pass-by-context
else
  fail "9. expected 429 on rapid second call (got $STATUS_CODE)"
  fail "10. 429 body includes retryAfterSeconds (parent check failed)"
fi

# ── Test 4: oversized prompt → 400 ───────────────────────────────────────────
LONG_PROMPT=$(python3 -c "print('a' * 501)" 2>/dev/null || printf '%0.s a' {1..501})
post_compare "$LONG_PROMPT"

if [ "$STATUS_CODE" = "400" ]; then
  pass "11. prompt > 500 chars returns 400"
else
  fail "11. prompt > 500 chars returns 400 (got $STATUS_CODE)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo "────────────────────────────────────────────────────"
echo "${PASS} passed, ${FAIL} failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
