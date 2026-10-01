-- Stand-in for production as of v1 (Supabase auth + the tables v2 touches),
-- reconstructed from supabase-migrations.sql, CLAUDE.md and the v1 code.
-- The real schema may differ (e.g. extra NOT NULLs); staging catches that.

CREATE SCHEMA auth;

CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supabase's auth.uid(): the `sub` claim of the caller's JWT.
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE ROLE authenticated NOLOGIN;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  steps JSONB,
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  start_time TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  priority SMALLINT CHECK (priority IN (1, 2, 3)),
  recurrence JSONB,
  step_dates JSONB,
  start_commitment TIMESTAMPTZ,
  first_interaction_at TIMESTAMPTZ,
  last_nudge_sent TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
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
CREATE POLICY "Users manage own tasks" ON tasks FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  nudge_email_enabled BOOLEAN DEFAULT true,
  email_reminders_enabled BOOLEAN DEFAULT true,
  email_reports_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
