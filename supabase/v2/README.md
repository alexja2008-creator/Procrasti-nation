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

`npm test` also runs every check against `.local/prod-schema.sql` when it exists, so the real production structure (including the schools tables and the teacher RLS policy) is covered locally.

What the 2026-10-03 production dump and stats changed: `tasks.source` already existed ('self' | 'assignment', used by the schools feature), so v2 widens it instead of adding it and the rollback keeps it; steps carry `completedAt` and some lack a `completed` flag, so the backfill uses both and treats steps of completed tasks as done. Expected on production: 24 tasks converted, 145 steps created.
