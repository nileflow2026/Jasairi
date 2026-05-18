#!/usr/bin/env bash
# scripts/rollback-ota.sh
# ─────────────────────────────────────────────────────────────────────────────
# JASIRI Mobile — EAS OTA Update Rollback Script
#
# Usage:
#   ./scripts/rollback-ota.sh list                # list recent updates on production branch
#   ./scripts/rollback-ota.sh <update-group-id>   # republish that update group as latest
#   ./scripts/rollback-ota.sh emergency            # point production channel to last store build
#
# Prerequisites:
#   npm install -g eas-cli
#   eas login
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BRANCH="production"
CHANNEL="production"

log()  { echo "[ota-rollback] $*"; }
fail() { echo "[ota-rollback] ERROR: $*" >&2; exit 1; }

ACTION="${1:-}"

if [ -z "$ACTION" ]; then
  echo "Usage:"
  echo "  $0 list                   — list recent OTA updates"
  echo "  $0 <update-group-id>      — republish a prior update as latest"
  echo "  $0 emergency              — disable OTA; revert to store binary"
  exit 0
fi

cd "$(dirname "$0")/.." # run from Jasiri/ directory

case "$ACTION" in
  list)
    log "Recent OTA updates on branch: $BRANCH"
    eas update:list --branch "$BRANCH" --non-interactive
    ;;

  emergency)
    log "EMERGENCY: Disabling OTA updates on channel '$CHANNEL'"
    log "Users will fall back to the version installed from the store."
    # Point the production channel at an empty/stable branch
    # Replace 'last-stable' with the actual branch name if different
    eas channel:edit "$CHANNEL" --branch last-stable
    log "Done. All new app launches will use the store binary."
    ;;

  *)
    UPDATE_GROUP_ID="$ACTION"
    log "Rolling back OTA to update group: $UPDATE_GROUP_ID"
    log "Republishing update as latest on branch: $BRANCH"
    eas update:republish \
      --branch "$BRANCH" \
      --group "$UPDATE_GROUP_ID" \
      --non-interactive
    log "OTA rollback complete. New launches will receive the rolled-back update."
    ;;
esac
