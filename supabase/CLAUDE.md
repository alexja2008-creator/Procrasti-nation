# supabase

The database for staging and production. Table-by-table notes: `docs/architecture.md`, "Database".

- **v2 migration** (`v2/`): `01_schema.sql` (additive, idempotent), `03_push_cron.sql`, `04_fresh_start.sql` (the cutover's fresh start: deletes every account; it ran on production at the cutover, **never run it again**), `99_rollback.sql`, `02_backfill.sql` (unused), and three read-only production queries, `prod-stats.sql`, `planner-reminders.sql` and `heard-from.sql`. `v2/README.md` explains each. `migrations/` holds v1-era fixes (the two `profiles` billing scripts and `add_first_interaction_at.sql`); `v1-migrations-archive.sql` is v1's history.
- **Tests:** `npm run db:test` from the root runs `01_schema.sql` on real Postgres (PGlite), with RLS checks as a signed-in user. The one-off scripts (backfill, rollback, fresh start) and the read-only queries aren't tested. When `v2/.local/prod-schema.sql` exists (gitignored; regenerate with `v2/scripts/dump-prod-schema.sh`), the tests also run against production's real structure. Re-dump whenever production's structure changes.
- **Every table has RLS.** Server-only tables (`push_sends`, `push_snoozes`) have RLS on and no policies. Ownership triggers stop `list_id`, `task_id`, `parent_id` and `note_id` pointing at another user's rows; keep that pattern for any new foreign key between user-owned rows.
- **Naming:** `*_on` is a local DATE, `*_at` a TIMESTAMPTZ. Soft deletes through `deleted_at`.
- **No GIN index for search:** under RLS Postgres can't use one. Bound queries with an explicit `user_id = auth.uid()`.
- **Staging** (`mbuakrohovzjegonrplp`) gets production's structure, never users' data. Rehearse writes inside `BEGIN … ROLLBACK`, but sequences don't roll back: never test `user_settings` inserts that way, or citizen numbers are burned.
- **Production** SQL is applied by Alex in the Supabase SQL Editor. Don't use the production service-role key to explore.
- **The schools tables** (`organizations`, `classes`, `assignments` and so on) and the teacher policy are leftovers Alex decided to leave alone. Don't build on them or clean them up; a security hole in them still matters.
- **Auth emails:** the four templates in `v2/email-templates/` are pasted into each project by hand; change them here first.
