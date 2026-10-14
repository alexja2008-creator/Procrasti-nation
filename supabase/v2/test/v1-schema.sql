-- Stand-in for production's v1 structure (the tables v2 touches), mirroring
-- the real `tasks` and `profiles` definitions from a pg_dump of production on
-- 2026-10-03. Loaded after the tests' Supabase stub (auth schema, roles,
-- default grants). When supabase/v2/.local/prod-schema.sql exists, the tests
-- also run against that real dump.

CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'in_progress',
  steps JSONB DEFAULT '[]'::jsonb,
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  start_time TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_nudge_sent TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  priority SMALLINT,
  recurrence JSONB,
  step_dates JSONB,
  start_commitment TIMESTAMPTZ,
  first_interaction_at TIMESTAMPTZ,
  -- References public.assignments in production (schools feature); no FK here.
  assignment_id UUID,
  source TEXT DEFAULT 'self' NOT NULL,
  CONSTRAINT tasks_priority_check CHECK (priority IN (1, 2, 3)),
  CONSTRAINT tasks_source_check CHECK (source IN ('self', 'assignment')),
  CONSTRAINT tasks_status_check CHECK (status IN ('in_progress', 'completed'))
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own tasks" ON tasks
  USING (auth.uid() = user_id);

CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  nudge_email_enabled BOOLEAN DEFAULT true,
  stripe_customer_id TEXT,
  stripe_subscription_status TEXT,
  email_reminders_enabled BOOLEAN DEFAULT true,
  email_reports_enabled BOOLEAN DEFAULT true
);

CREATE UNIQUE INDEX profiles_username_lower_idx ON profiles (LOWER(username));

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT
  USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE
  USING (user_id = auth.uid());
