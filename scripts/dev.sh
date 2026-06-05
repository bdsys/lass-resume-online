#!/usr/bin/env bash
# Manage the local Next.js dev server (hot-reload, Turbopack).
#
# Usage:
#   bash scripts/dev.sh up   [port]   — start in background, wait until ready
#   bash scripts/dev.sh down [port]   — stop cleanly, kill any zombie on the port
#
# Runtime files (gitignored):
#   .dev.pid — PID of the nohup'd npm process
#   .dev.log — combined stdout/stderr of the dev server
#
# Note: uses `ss` for port detection rather than `lsof` — ss is reliable in WSL;
# lsof does not consistently report listening TCP sockets in this environment.
set -euo pipefail

SUBCOMMAND=${1:-up}
PORT=${2:-${DEV_PORT:-3000}}
BASE="http://localhost:${PORT}"
PID_FILE=".dev.pid"
LOG_FILE=".dev.log"

# Returns 0 if something is listening on PORT, 1 otherwise.
port_listening() {
  ss -tlnp 2>/dev/null | grep -q ":${PORT}[[:space:]]"
}

# Kill whatever is holding PORT (by PID from ss output); idempotent.
kill_port() {
  local pids
  pids=$(ss -tlnp 2>/dev/null | grep ":${PORT}[[:space:]]" | grep -oP 'pid=\K[0-9]+' | sort -u)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

# Wait up to 5s for PORT to be fully released (mirrors smoke.sh).
wait_port_release() {
  for i in $(seq 1 5); do
    port_listening || return 0
    echo "  Waiting for port ${PORT} to be released (${i}s)…"
    sleep 1
  done
}

# ── up ────────────────────────────────────────────────────────────────────────
up() {
  if port_listening; then
    echo "Dev server already running → ${BASE}"
    echo "  (use 'make down' to stop it)"
    exit 0
  fi

  echo "Starting dev server on port ${PORT}…"
  nohup npm run dev -- -p "$PORT" >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"

  # Wait up to 30s for the server to accept connections
  echo "Waiting for server on port ${PORT}…"
  for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" "$BASE/" 2>/dev/null | grep -q "200"; then
      echo ""
      echo "Dev server up → ${BASE}"
      echo "  Logs: ${LOG_FILE}   PID: $(cat "$PID_FILE")"
      exit 0
    fi
    printf "."
    sleep 1
  done

  echo ""
  echo "ERROR: dev server did not become ready within 30s"
  echo "Last log lines:"
  tail -20 "$LOG_FILE" 2>/dev/null || true
  exit 1
}

# ── down ──────────────────────────────────────────────────────────────────────
down() {
  local stopped=0

  # Kill by saved PID first (clean shutdown)
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      echo "Stopping dev server (PID ${pid})…"
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
      stopped=1
    fi
    rm -f "$PID_FILE"
  fi

  # Defensive port sweep — catches orphaned next-server processes that
  # lsof misses in WSL; ss -tlnp is reliable here.
  if port_listening; then
    echo "Killing orphaned process(es) on port ${PORT}…"
    kill_port
    stopped=1
  fi

  wait_port_release

  if [ "$stopped" -eq 1 ]; then
    echo "Dev server stopped."
  else
    echo "Dev server was not running."
  fi
}

case "$SUBCOMMAND" in
  up)   up   ;;
  down) down ;;
  *)
    echo "Usage: $0 {up|down} [port]"
    exit 1
    ;;
esac
