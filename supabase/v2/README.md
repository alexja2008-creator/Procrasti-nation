# v2 database migration

Moves the shared Supabase database to the ProcrastiNation 2.0 data model without breaking the live v1 site.

| File | What it does | When to run |
|---|---|---|
| `01_schema.sql` | Adds `user_settings`, `lists`, `notes`, `stamps`, `start_sessions`, `push_tokens` and the v2 columns on `tasks`. **Additive only**: v1 ignores all of it. Idempotent. | Staging now; production any time before cutover |
| `02_backfill.sql` | Turns each v1 task's `steps` JSONB into child rows and fills `due_on`/`rrule`/`source`. Idempotent; never modifies v1 columns. | **Only at cutover**, when v1 is retired (v1 would show each step as a separate task) |
| `99_rollback.sql` | Removes everything above and restores the v1 schema exactly. Loses v2-only data (subtasks, lists, notes, stamps, settings). | If cutover has to be undone |

Run them in the Supabase SQL Editor, in order.

## Test locally

Runs all three scripts against real Postgres (PGlite, in-process) on a stand-in of the v1 schema (`test/v1-schema.sql`), including RLS checks as a signed-in user:

```bash
npm install && npm test
```

## Staging (before anything touches production)

Staging project: `mbuakrohovzjegonrplp`. It gets production's **structure only**; real users' data stays in production.

1. `brew install libpq` (gives `pg_dump`/`psql`).
2. `scripts/dump-prod-schema.sh`: reads production's public-schema DDL into `.local/prod-schema.sql` (gitignored). Read-only; asks for the connection string at a hidden prompt.
3. `scripts/save-staging-url.sh`: stores the staging connection string in `.env.staging` (gitignored) so the schema and migrations can be applied there.
4. Run `prod-stats.sql` in the **production** SQL Editor (SELECT only; counts and anonymized patterns, no personal data). Its numbers predict what `02_backfill.sql` will do on real data and flag shapes the tests don't cover yet.
5. Apply `.local/prod-schema.sql` to staging, then `01_schema.sql`; seed test users and v1-shaped tasks; run `02_backfill.sql`; check; run `99_rollback.sql`; re-apply.

Connection strings: Supabase dashboard → project → **Connect** → **Session pooler** (the direct connection is IPv6-only on the free plan).

Known differences from the test stand-in that staging will reveal: any extra `NOT NULL` columns on the real `tasks` table, and the real RLS policies.
