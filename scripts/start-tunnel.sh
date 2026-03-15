#!/bin/bash
# Section 8 Scanner — startup script (KeepAlive compatible)
# Starts FastAPI server + Cloudflare tunnel, auto-updates Vercel env var
# This script is meant to stay running — launchd KeepAlive restarts it if it exits

set -eo pipefail

# Extract env vars from .zshrc without sourcing it (avoids interactive shell hangs)
eval "$(grep -E '^export (VERCEL_TOKEN|HUD_API_TOKEN)=' "$HOME/.zshrc" 2>/dev/null || true)"

VERCEL_TOKEN="${VERCEL_TOKEN:-}"
VERCEL_PROJECT_ID="prj_1xOqiJpkdO8uzP6gyBSDpc1nzosW"
VERCEL_ENV_ID="0ppAyuaoXevVQPIz"
API_PORT=8100
PYTHON="$HOME/Projects/section8-finder/venv/bin/python3"
APP_DIR="$HOME/Projects/section8-app"
HUD_API_TOKEN="${HUD_API_TOKEN:-}"
TUNNEL_URL_FILE="/tmp/section8-tunnel-url.txt"

echo "=== $(date) === Starting Section 8 services ==="

# Cleanup function
cleanup() {
    echo "=== $(date) === Shutting down ==="
    kill $API_PID 2>/dev/null || true
    kill $TUNNEL_PID 2>/dev/null || true
    exit 0
}
trap cleanup EXIT TERM INT

# Kill any stale instances
pkill -f "uvicorn api_server" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 2

# Start FastAPI server
cd "$APP_DIR"
HUD_API_TOKEN="$HUD_API_TOKEN" \
  "$PYTHON" -m uvicorn api_server:app \
    --host 127.0.0.1 \
    --port "$API_PORT" \
    --log-level warning &
API_PID=$!
echo "FastAPI PID: $API_PID"

# Wait for API to be ready
for i in $(seq 1 20); do
    if curl -sf "http://127.0.0.1:$API_PORT/api/health" > /dev/null 2>&1; then
        echo "FastAPI ready after ${i}s"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "ERROR: FastAPI failed to start after 20s"
        exit 1
    fi
    sleep 1
done

# Start cloudflared in foreground, capture URL from stderr
TUNNEL_LOG="/tmp/section8-tunnel-startup.log"
: > "$TUNNEL_LOG"

# Run cloudflared, tee stderr so we can capture URL while it runs
cloudflared tunnel --url "http://127.0.0.1:$API_PORT" 2>&1 | tee -a "$TUNNEL_LOG" &
TUNNEL_PID=$!
echo "Cloudflared PID: $TUNNEL_PID"

# Wait for tunnel URL to appear in log
TUNNEL_URL=""
for i in $(seq 1 30); do
    TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1 || true)
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
    sleep 1
done

if [ -n "$TUNNEL_URL" ]; then
    echo "Tunnel URL: $TUNNEL_URL"
    echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
    
    # Update Vercel env var
    if [ -n "$VERCEL_TOKEN" ]; then
        echo "Updating Vercel env var..."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
            "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$VERCEL_ENV_ID" \
            -H "Authorization: Bearer $VERCEL_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"key\":\"MAC_MINI_API_URL\",\"value\":\"$TUNNEL_URL\",\"type\":\"plain\",\"target\":[\"production\"]}")
        echo "Vercel update HTTP: $HTTP_CODE"
        
        if [ "$HTTP_CODE" = "200" ]; then
            # Trigger redeploy
            echo "Triggering Vercel redeploy..."
            LATEST=$(curl -s "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&limit=1&target=production" \
                -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['deployments'][0]['uid'])" 2>/dev/null || echo "")
            if [ -n "$LATEST" ]; then
                curl -s -X POST \
                    "https://api.vercel.com/v13/deployments" \
                    -H "Authorization: Bearer $VERCEL_TOKEN" \
                    -H "Content-Type: application/json" \
                    -d "{\"name\":\"section8-app\",\"deploymentId\":\"$LATEST\",\"target\":\"production\"}" > /dev/null 2>&1
                echo "Redeploy triggered"
            fi
        fi
    fi
    echo "=== $(date) === Section 8 Scanner live at $TUNNEL_URL ==="
else
    echo "WARNING: Could not capture tunnel URL after 30s"
fi

# Block on cloudflared — when it exits, launchd KeepAlive restarts the whole script
wait $TUNNEL_PID 2>/dev/null
EXIT_CODE=$?
echo "=== $(date) === Cloudflared exited (code $EXIT_CODE), launchd will restart ==="
