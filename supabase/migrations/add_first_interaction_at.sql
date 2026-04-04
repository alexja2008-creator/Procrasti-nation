-- Add first_interaction_at column to tasks table
-- Tracks when the user first acts on a task (marks a step complete or edits a step)
-- Used to measure friction: the gap between task creation and first engagement
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS first_interaction_at TIMESTAMPTZ;
