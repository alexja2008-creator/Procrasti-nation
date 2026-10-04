#!/usr/bin/env bash
# Copies production's table structure (public schema DDL: tables, constraints,
# indexes, RLS policies, triggers, functions) to supabase/v2/.local/prod-schema.sql.
# NO DATA is copied, and nothing on production is changed (pg_dump only reads).
#
# Asks for the connection string at a hidden prompt, so the password stays out
# of shell history and out of the repo.
set -euo pipefail
cd "$(dirname "$0")/.."

PG_BIN="$(brew --prefix libpq 2>/dev/null)/bin"
if [ ! -x "$PG_BIN/pg_dump" ]; then
  echo "pg_dump not found. Install it first:  brew install libpq"
  exit 1
fi

echo "Paste PRODUCTION's Session pooler connection string (Supabase → Connect → Session pooler),"
read -rsp "with [YOUR-PASSWORD] replaced. It won't be shown: " PROD_DB_URL
echo

mkdir -p .local
"$PG_BIN/pg_dump" "$PROD_DB_URL" \
  --schema-only --schema=public --no-owner --no-privileges \
  --file=.local/prod-schema.sql

echo "Done: supabase/v2/.local/prod-schema.sql ($(wc -l < .local/prod-schema.sql | tr -d ' ') lines). Structure only, no data."
