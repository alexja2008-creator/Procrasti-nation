-- ============================================================
-- ProcrastiNation — Supabase Migrations
-- Run these in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 0. Add due_date and priority columns to tasks table
--    due_date: optional deadline set by the user at task creation
--    priority: 1=Low, 2=Medium, 3=High (nullable — unset tasks sort last)

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority SMALLINT DEFAULT NULL CHECK (priority IN (1, 2, 3));

-- 1. Add last_nudge_sent column to tasks table
--    Tracks when the last re-engagement nudge was sent per task
--    so we don't send duplicate emails within 24 hours.

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS last_nudge_sent TIMESTAMPTZ DEFAULT NULL;

-- 2. Add updated_at column to tasks if not present
--    (used by nudge cron to detect stale tasks)
--    Skip this if updated_at already exists.

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Optional: auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Add start_commitment column to tasks table
--    Stores the user's commitment to START a task (not the due date).
--    Used by the commitment device feature — prompts at task creation,
--    shows countdown on dashboard, triggers nudge if missed.

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS start_commitment TIMESTAMPTZ DEFAULT NULL;

-- 4. Profiles table for usernames + public display
--    Needed for the social/friends feature and user profile pages.
--    RLS: anyone can read profiles, users can only insert/update their own.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Case-insensitive unique index for username lookups
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON profiles (LOWER(username));
