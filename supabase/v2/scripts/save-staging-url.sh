#!/usr/bin/env bash
# Saves the STAGING database connection string to supabase/v2/.env.staging
# (gitignored, readable only by you) so migrations can be applied and checked
# against staging. Staging only: never put the production string here.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Paste STAGING's Session pooler connection string (Supabase → Connect → Session pooler),"
read -rsp "with [YOUR-PASSWORD] replaced. It won't be shown: " STAGING_DB_URL
echo

case "$STAGING_DB_URL" in
  *mbuakrohovzjegonrplp*) ;;
  *) echo "That doesn't look like the staging project (mbuakrohovzjegonrplp). Nothing saved."; exit 1 ;;
esac

umask 077
printf 'STAGING_DB_URL=%s\n' "$STAGING_DB_URL" > .env.staging
echo "Saved to supabase/v2/.env.staging (gitignored)."
