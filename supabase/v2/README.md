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

## Staging checklist (before anything touches production)

1. Create a staging Supabase project and copy production's schema into it (`supabase db dump --schema-only` from prod, run in staging), plus a copy of the data.
2. Record counts: `SELECT count(*), sum(jsonb_array_length(steps)) FROM tasks WHERE jsonb_typeof(steps) = 'array';`
3. Run `01_schema.sql`, then `02_backfill.sql`. Its result row should show `tasks_converted` = all v1 tasks and `steps_created` = the step sum from step 2 (minus any non-object steps).
4. Spot-check a few users' tasks in the v2 app.
5. Run `99_rollback.sql` and confirm the counts and v1 site behavior match step 2, then re-apply.

Known differences from the test stand-in that staging will reveal: any extra `NOT NULL` columns on the real `tasks` table, and the real RLS policies.
