#!/usr/bin/env bash
# Restart the AutoStream Commerce API server (Fastify) on loopback :3001.
#
# Architecture (fixed 2026-08-11): the marketing site owns port 3000 (the team's
# single public surface). The API server listens on 127.0.0.1:3001 and the site's
# serve.ts proxies /api/* and /shopify/* to it — so Shopify webhooks keep working
# even after a site republish frees port 3000.
#
# Usage: bash scripts/restart_api.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# Load env vars (SHOPIFY_*, CJ_API_KEY, DATABASE_URL, REDIS_URL, CJ_SANDBOX).
set -a
# shellcheck disable=SC1091
source .env
set +a

export API_PORT="${API_PORT:-3001}"
LOG=/tmp/api_live.log

# Stop any previous instance.
pkill -f "tsx apps/api/src/index.ts" 2>/dev/null || true
sleep 1

setsid nohup npx tsx apps/api/src/index.ts > "$LOG" 2>&1 < /dev/null &
echo "API server starting on 127.0.0.1:${API_PORT} (log: $LOG, pid: $!)"
sleep 3
if curl -sf -o /dev/null "http://127.0.0.1:${API_PORT}/"; then
  echo "API server is up: http://127.0.0.1:${API_PORT}"
else
  echo "WARNING: API server not responding yet — check $LOG"
fi
