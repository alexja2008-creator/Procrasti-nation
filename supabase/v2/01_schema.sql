-- ============================================================
-- ProcrastiNation 2.0 — core schema
--
-- ADDITIVE ONLY. The live v1 site ignores every table and column added
-- here, so this file is safe on production before cutover. It is
-- idempotent (safe to run twice). Run on STAGING first; reverse with
-- 99_rollback.sql. Steps are NOT converted here; that's 02_backfill.sql,
-- run once at cutover.
--
-- Conventions:
--   *_on       local calendar DATE        *_at   TIMESTAMPTZ
--   deleted_at soft delete (offline sync needs tombstones)
--   sort_order float, so a row can move between two others without
--              renumbering the rest
-- ============================================================

-- Shared updated_at trigger (v1 section 2 already created it on prod).
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rejects list_id / task_id references to rows the writer doesn't own.
-- Runs as the invoking user, so RLS hides other users' rows and the
-- EXISTS check fails for them. FKs alone would accept a foreign id.
CREATE OR REPLACE FUNCTION v2_check_owned_refs()
RETURNS TRIGGER AS $$
DECLARE
  r JSONB := to_jsonb(NEW);
BEGIN
  IF r->>'list_id' IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM lists WHERE id = (r->>'list_id')::uuid AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'list % not found', r->>'list_id' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF r->>'task_id' IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM tasks WHERE id = (r->>'task_id')::uuid AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'task % not found', r->>'task_id' USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. user_settings: private per-user settings (Citizenship Application
--    answers, timezone, citizen number). Owner-only. Deliberately NOT on
--    `profiles`, which is publicly readable and requires a username.
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS citizen_number_seq;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  citizen_number BIGINT NOT NULL UNIQUE DEFAULT nextval('citizen_number_seq'),
  timezone TEXT,
  day_rollover_hour SMALLINT NOT NULL DEFAULT 0 CHECK (day_rollover_hour BETWEEN 0 AND 6),
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER SEQUENCE citizen_number_seq OWNED BY user_settings.citizen_number;

-- Existing users get citizen numbers in signup order, so early users
-- get the low numbers. New users get theirs when the app first creates
-- their row (lazily, so the live signup path is untouched).
INSERT INTO user_settings (user_id, citizen_number, created_at)
SELECT u.id,
       (SELECT COALESCE(max(citizen_number), 0) FROM user_settings) + row_number() OVER (ORDER BY u.created_at, u.id),
       now()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM user_settings s WHERE s.user_id = u.id);

SELECT setval(
  'citizen_number_seq',
  GREATEST((SELECT COALESCE(max(citizen_number), 0) FROM user_settings), 1),
  (SELECT count(*) > 0 FROM user_settings)
);

-- Citizen numbers are assigned by the database and never change.
CREATE OR REPLACE FUNCTION user_settings_guard_citizen_number()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.citizen_number := nextval('citizen_number_seq');
  ELSE
    NEW.citizen_number := OLD.citizen_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_settings_citizen_number ON user_settings;
CREATE TRIGGER user_settings_citizen_number
  BEFORE INSERT OR UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION user_settings_guard_citizen_number();

DROP TRIGGER IF EXISTS user_settings_updated_at ON user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their settings" ON user_settings;
CREATE POLICY "Owners manage their settings" ON user_settings FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------
-- 2. lists: Territories. Tasks with list_id NULL sit in Customs.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  kind TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('school', 'work', 'home', 'custom')),
  ink TEXT NOT NULL DEFAULT 'forest' CHECK (ink IN ('terracotta', 'violet', 'forest')),
  sort_order DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS lists_user_idx ON lists (user_id, sort_order);

DROP TRIGGER IF EXISTS lists_updated_at ON lists;
CREATE TRIGGER lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their lists" ON lists;
CREATE POLICY "Owners manage their lists" ON lists FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------
-- 3. tasks: v2 columns. Plan steps and subtasks become child rows
--    (parent_id, one level deep). The v1 columns (steps, step_dates,
--    recurrence, due_date, ...) stay untouched for the live site and are
--    dropped later by a separate contract migration.
-- ------------------------------------------------------------
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES lists(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_on DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remind_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rrule TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimate_minutes INTEGER CHECK (estimate_minutes > 0);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_on DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order DOUBLE PRECISION NOT NULL DEFAULT 0;
-- `source` predates v2: the schools feature uses 'self' | 'assignment', and the
-- teacher RLS policy reads it. v2 keeps the column and widens the allowed values
-- ('self' still means typed by the person; 'ai' marks AI-built plan steps).
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'self';
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_source_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_source_check
  CHECK (source IN ('self', 'assignment', 'ai', 'syllabus', 'lms', 'reminders'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- Backfill bookkeeping: which v1 rows were converted, and which child
-- rows came from a v1 step (its 1-based position in the steps array).
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS v1_backfilled_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS legacy_step_index INTEGER;

CREATE INDEX IF NOT EXISTS tasks_user_parent_idx ON tasks (user_id, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS tasks_parent_idx ON tasks (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_list_idx ON tasks (list_id) WHERE list_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_user_scheduled_idx ON tasks (user_id, scheduled_on) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tasks_remind_idx ON tasks (remind_at) WHERE remind_at IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_external_idx ON tasks (user_id, source, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_legacy_step_idx ON tasks (parent_id, legacy_step_index) WHERE legacy_step_index IS NOT NULL;

-- A parent must belong to the same user and be top-level, and a task
-- that has children can't become a child (keeps nesting one level deep).
CREATE OR REPLACE FUNCTION tasks_check_owned_refs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF NEW.parent_id = NEW.id OR NOT EXISTS (
      SELECT 1 FROM tasks WHERE id = NEW.parent_id AND user_id = NEW.user_id AND parent_id IS NULL
    ) THEN
      RAISE EXCEPTION 'parent task % not found', NEW.parent_id USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM tasks WHERE parent_id = NEW.id) THEN
      RAISE EXCEPTION 'task % has subtasks and cannot become a subtask', NEW.id USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_owned_refs ON tasks;
CREATE TRIGGER tasks_owned_refs
  BEFORE INSERT OR UPDATE OF parent_id, list_id, user_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION tasks_check_owned_refs();

DROP TRIGGER IF EXISTS tasks_owned_list ON tasks;
CREATE TRIGGER tasks_owned_list
  BEFORE INSERT OR UPDATE OF list_id, user_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION v2_check_owned_refs();

-- ------------------------------------------------------------
-- 4. notes: capture-first notes, optionally attached to a task or list.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notes_user_idx ON notes (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS notes_list_idx ON notes (list_id) WHERE list_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notes_task_idx ON notes (task_id) WHERE task_id IS NOT NULL;

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS notes_owned_refs ON notes;
CREATE TRIGGER notes_owned_refs
  BEFORE INSERT OR UPDATE OF list_id, task_id, user_id ON notes
  FOR EACH ROW EXECUTE FUNCTION v2_check_owned_refs();

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their notes" ON notes;
CREATE POLICY "Owners manage their notes" ON notes FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------
-- 5. stamps: rewards. Awarded on-device (offline-first), so clients
--    insert them; there's nothing to gain by forging your own stamps.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (char_length(kind) BETWEEN 1 AND 40),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stamps_user_idx ON stamps (user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS stamps_task_idx ON stamps (task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stamps_list_idx ON stamps (list_id) WHERE list_id IS NOT NULL;

DROP TRIGGER IF EXISTS stamps_owned_refs ON stamps;
CREATE TRIGGER stamps_owned_refs
  BEFORE INSERT OR UPDATE OF list_id, task_id, user_id ON stamps
  FOR EACH ROW EXECUTE FUNCTION v2_check_owned_refs();

ALTER TABLE stamps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their stamps" ON stamps;
CREATE POLICY "Owners manage their stamps" ON stamps FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------
-- 6. start_sessions: every Start Mode session. Powers the "starts"
--    metric, ranks and the North Star (weekly starters). Kept when the
--    task is deleted.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS start_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ CHECK (ended_at IS NULL OR ended_at >= started_at),
  planned_minutes SMALLINT NOT NULL CHECK (planned_minutes BETWEEN 1 AND 180),
  outcome TEXT CHECK (outcome IN ('done', 'kept-going', 'stopped', 'stuck')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS start_sessions_user_idx ON start_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS start_sessions_task_idx ON start_sessions (task_id) WHERE task_id IS NOT NULL;

DROP TRIGGER IF EXISTS start_sessions_updated_at ON start_sessions;
CREATE TRIGGER start_sessions_updated_at
  BEFORE UPDATE ON start_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS start_sessions_owned_refs ON start_sessions;
CREATE TRIGGER start_sessions_owned_refs
  BEFORE INSERT OR UPDATE OF task_id, user_id ON start_sessions
  FOR EACH ROW EXECUTE FUNCTION v2_check_owned_refs();

ALTER TABLE start_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their start sessions" ON start_sessions;
CREATE POLICY "Owners manage their start sessions" ON start_sessions FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ------------------------------------------------------------
-- 7. push_tokens: Expo push tokens (iOS) and Web Push subscriptions
--    (JSON in `token`). The app deletes its row on sign-out.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

DROP TRIGGER IF EXISTS push_tokens_updated_at ON push_tokens;
CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their push tokens" ON push_tokens;
CREATE POLICY "Owners manage their push tokens" ON push_tokens FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Not yet: `integrations` (LMS feed URLs, encrypted with Supabase Vault)
-- lands with Phase 5.
