-- ============================================================
-- ProcrastiNation 2.0 — rollback of 01_schema.sql + 02_backfill.sql
--
-- Restores the v1 schema exactly. v1 data is never modified by the v2
-- scripts, so nothing v1 depends on is lost. What IS lost: anything only
-- v2 knows about (subtasks/steps as rows, lists, notes, stamps, start
-- sessions, push tokens, settings, citizen numbers). Top-level tasks
-- created in v2 are kept and stay visible to v1.
-- ============================================================

-- Child rows (backfilled steps and v2 subtasks) would show up in v1 as
-- standalone tasks once parent_id is gone, so remove them first.
DELETE FROM tasks WHERE parent_id IS NOT NULL;

DROP TABLE IF EXISTS plan_generations;
DROP TABLE IF EXISTS push_tokens;
DROP TABLE IF EXISTS start_sessions;
DROP TABLE IF EXISTS stamps;
DROP TABLE IF EXISTS notes;

DROP TRIGGER IF EXISTS tasks_owned_refs ON tasks;
DROP TRIGGER IF EXISTS tasks_owned_list ON tasks;

-- `source` predates v2 (schools feature), so keep the column and restore its
-- v1 values. Never drop it: assignment tasks and the teacher policy depend on it.
UPDATE tasks SET source = 'self' WHERE source NOT IN ('self', 'assignment');
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_source_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_source_check CHECK (source IN ('self', 'assignment'));

ALTER TABLE tasks
  DROP COLUMN IF EXISTS list_id,
  DROP COLUMN IF EXISTS parent_id,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS due_on,
  DROP COLUMN IF EXISTS due_at,
  DROP COLUMN IF EXISTS remind_at,
  DROP COLUMN IF EXISTS rrule,
  DROP COLUMN IF EXISTS estimate_minutes,
  DROP COLUMN IF EXISTS scheduled_on,
  DROP COLUMN IF EXISTS sort_order,
  DROP COLUMN IF EXISTS external_id,
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS v1_backfilled_at,
  DROP COLUMN IF EXISTS legacy_step_index;

DROP TABLE IF EXISTS lists;
DROP TABLE IF EXISTS user_settings;
DROP SEQUENCE IF EXISTS citizen_number_seq;

DROP FUNCTION IF EXISTS v2_backfill_tasks();
DROP FUNCTION IF EXISTS v2_parse_minutes(TEXT);
DROP FUNCTION IF EXISTS v2_try_date(TEXT);
DROP FUNCTION IF EXISTS v2_try_timestamptz(TEXT);
DROP FUNCTION IF EXISTS tasks_check_owned_refs();
DROP FUNCTION IF EXISTS v2_check_owned_refs();
DROP FUNCTION IF EXISTS user_settings_guard_citizen_number();
-- update_updated_at_column() stays: v1 uses it.
