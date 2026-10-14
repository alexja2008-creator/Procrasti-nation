#!/bin/sh
# Development stand-in for Supabase Cron (supabase/v2/03_push_cron.sql): calls
# the local Web Push sender at the start of every minute and prints what it
# did. Start the site first (npm run dev). Ctrl-C stops it.
#   sh scripts/push-cron-dev.sh              # http://localhost:3000
#   PUSH_URL=http://localhost:3001/api/cron/push sh scripts/push-cron-dev.sh
cd "$(dirname "$0")/.." || exit 1
SECRET=$(grep -h '^CRON_SECRET=' .env.development.local .env.local 2>/dev/null | head -1 | cut -d= -f2-)
[ -n "$SECRET" ] || { echo "CRON_SECRET isn't in .env.development.local or .env.local" >&2; exit 1; }
URL=${PUSH_URL:-http://localhost:3000/api/cron/push}
echo "Calling $URL every minute"
while true; do
  sleep $((60 - $(date +%S | sed 's/^0//')))
  printf '%s ' "$(date +%T)"
  curl -s -X POST -H "Authorization: Bearer $SECRET" "$URL"
  echo
done
