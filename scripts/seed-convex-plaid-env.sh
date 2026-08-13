#!/usr/bin/env bash
# Copy Plaid sandbox credentials from Cursor Cloud secrets onto the
# anonymous local Convex deployment. Safe to run more than once.
#
# Required secrets (Cursor dashboard → Cloud Agents → environment Secrets):
#   PLAID_CLIENT_ID
#   PLAID_SECRET
# Optional:
#   PLAID_ENV   (defaults to sandbox)
set -euo pipefail

if [[ -z "${PLAID_CLIENT_ID:-}" || -z "${PLAID_SECRET:-}" ]]; then
  echo "PLAID_CLIENT_ID / PLAID_SECRET are not set in Cursor Cloud secrets; skipping Convex Plaid env seed."
  echo "Add them on the environment Secrets tab, then re-run this script after Convex is up."
  exit 0
fi

export CONVEX_AGENT_MODE=anonymous

echo "Provisioning local Convex (anonymous) if needed..."
npx convex init

echo "Setting Convex env PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV..."
npx convex env set PLAID_CLIENT_ID "$PLAID_CLIENT_ID"
npx convex env set PLAID_SECRET "$PLAID_SECRET"
npx convex env set PLAID_ENV "${PLAID_ENV:-sandbox}"
echo "Convex Plaid env vars are set."
