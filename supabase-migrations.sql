-- ============================================================
-- ProcrastiNation — Supabase Migrations
-- Run these in: Supabase Dashboard → SQL Editor
-- ============================================================

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
