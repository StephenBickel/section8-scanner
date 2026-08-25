#!/usr/bin/env bash
# Start the protected scanner API and expose it through a temporary Cloudflare tunnel.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
API_PORT="${API_PORT:-8100}"
PYTHON_BIN="${SCANNER_PYTHON:-python3}"
TUNNEL_LOG="${TUNNEL_LOG:-/tmp/section8-tunnel-startup.log}"
TUNNEL_URL_FILE="${TUNNEL_URL_FILE:-/tmp/section8-tunnel-url.txt}"

if [[ -z "${SCANNER_API_KEY:-}" ]]; then
  echo "SCANNER_API_KEY is required" >&2
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is required" >&2
  exit 1
fi

cleanup() {
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "${TUNNEL_PID:-}" ]] && kill "$TUNNEL_PID" 2>/dev/null || true
}
trap cleanup EXIT TERM INT

cd "$APP_DIR"
"$PYTHON_BIN" -m uvicorn api_server:app \
  --host 127.0.0.1 \
  --port "$API_PORT" \
  --log-level warning &
API_PID=$!

for attempt in $(seq 1 20); do
  if curl --fail --silent "http://127.0.0.1:$API_PORT/api/health" >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 20 ]]; then
    echo "Scanner API did not become ready" >&2
    exit 1
  fi
  sleep 1
done

: > "$TUNNEL_LOG"
cloudflared tunnel --url "http://127.0.0.1:$API_PORT" 2>&1 | tee -a "$TUNNEL_LOG" &
TUNNEL_PID=$!

TUNNEL_URL=""
for _ in $(seq 1 30); do
  TUNNEL_URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -1 || true)"
  [[ -n "$TUNNEL_URL" ]] && break
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "Could not discover the Cloudflare tunnel URL" >&2
  exit 1
fi

printf '%s\n' "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
echo "Scanner tunnel: $TUNNEL_URL"
echo "Set SCANNER_MODE=remote and SCANNER_API_URL=$TUNNEL_URL on the web app."

wait "$TUNNEL_PID"
