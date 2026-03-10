#!/bin/bash
# Section 8 Scanner — startup script
# Starts FastAPI server + Cloudflare tunnel, auto-updates Vercel env var

set -euo pipefail

# Load secrets from ~/.zshrc (not hardcoded here)
source "$HOME/.zshrc" 2>/dev/null || true

# These can be overridden by environment but default to values in .zshrc
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
VERCEL_PROJECT_ID="prj_1xOqiJpkdO8uzP6gyBSDpc1nzosW"
VERCEL_ENV_ID="0ppAyuaoXevVQPIz"
API_PORT=8100
LOG_FILE="$HOME/Library/Logs/section8-tunnel.log"
PYTHON="$HOME/Projects/section8-finder/venv/bin/python3"
APP_DIR="$HOME/Projects/section8-app"
HUD_API_TOKEN="${HUD_API_TOKEN:-}"

exec >> "$LOG_FILE" 2>&1
echo "=== $(date) === Starting Section 8 tunnel ==="

# Kill any existing instances
pkill -f "uvicorn api_server" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# Start FastAPI server
cd "$APP_DIR"
HUD_API_TOKEN="$HUD_API_TOKEN" \
  "$PYTHON" -m uvicorn api_server:app \
    --host 127.0.0.1 \
    --port "$API_PORT" \
    --log-level warning &
API_PID=$!
echo "API server PID: $API_PID"

# Wait for API to be ready
for i in $(seq 1 15); do
  if curl -sf "http://127.0.0.1:$API_PORT/api/health" > /dev/null 2>&1; then
    echo "API ready after ${i}s"
    break
  fi
  sleep 1
done

# Start cloudflared, capture URL, update Vercel
TUNNEL_URL=""
cloudflared tunnel --url "http://127.0.0.1:$API_PORT" 2>&1 | while IFS= read -r line; do
  echo "[cloudflared] $line"
  if [[ "$line" =~ https://[a-z0-9-]+\.trycloudflare\.com ]]; then
    TUNNEL_URL="${BASH_REMATCH[0]}"
    echo ">>> Tunnel URL: $TUNNEL_URL"

    # Update Vercel env var (server-side MAC_MINI_API_URL, not NEXT_PUBLIC_)
    echo "Updating Vercel env var..."
    curl -s -X PATCH \
      "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$VERCEL_ENV_ID" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"key\":\"MAC_MINI_API_URL\",\"value\":\"$TUNNEL_URL\",\"type\":\"plain\",\"target\":[\"production\"]}" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Vercel update:', d.get('key','error'), d.get('error','ok'))"

    # Trigger Vercel redeploy
    echo "Triggering Vercel redeploy..."
    LATEST=$(curl -s "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&limit=1&target=production" \
      -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['deployments'][0]['uid'])" 2>/dev/null || echo "")
    if [ -n "$LATEST" ]; then
      curl -s -X POST \
        "https://api.vercel.com/v13/deployments" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"section8-app\",\"deploymentId\":\"$LATEST\",\"target\":\"production\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Redeploy:', d.get('url','error'), d.get('error',''))" 2>/dev/null || echo "Redeploy triggered"
    fi
    echo "Done. Live scanning active at https://section8-app.vercel.app"
  fi
done
