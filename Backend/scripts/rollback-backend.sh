#!/usr/bin/env bash
# scripts/rollback-backend.sh
# ─────────────────────────────────────────────────────────────────────────────
# JASIRI Backend — Railway Rollback Script
#
# Usage:
#   ./scripts/rollback-backend.sh              # lists recent deployments
#   ./scripts/rollback-backend.sh <deploy-id>  # rolls back to that deployment
#
# Prerequisites:
#   npm install -g @railway/cli
#   railway login
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SERVICE="jasiri-backend"
HEALTH_URL="${BACKEND_HEALTH_URL:-https://api.jasiri.app}"

# ── Helpers ───────────────────────────────────────────────────────────────────

log()  { echo "[rollback] $*"; }
fail() { echo "[rollback] ERROR: $*" >&2; exit 1; }

check_health() {
  local url="$HEALTH_URL/health"
  local status
  status=$(curl --silent --max-time 15 -o /dev/null -w "%{http_code}" "$url" || echo "000")
  if [ "$status" = "200" ]; then
    log "Health check passed ($url → $status)"
    return 0
  else
    log "Health check FAILED ($url → $status)"
    return 1
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────

DEPLOYMENT_ID="${1:-}"

if [ -z "$DEPLOYMENT_ID" ]; then
  log "No deployment ID provided. Listing recent deployments for: $SERVICE"
  railway deployments list --service "$SERVICE"
  echo ""
  echo "Re-run with a deployment ID to roll back:"
  echo "  ./scripts/rollback-backend.sh <deployment-id>"
  exit 0
fi

log "Rolling back $SERVICE to deployment: $DEPLOYMENT_ID"
railway deployments redeploy "$DEPLOYMENT_ID" --service "$SERVICE"

log "Waiting 30 seconds for the deployment to stabilise..."
sleep 30

if check_health; then
  log "Rollback complete. Service is healthy."
else
  fail "Rollback completed but health check failed. Manual investigation required."
fi
