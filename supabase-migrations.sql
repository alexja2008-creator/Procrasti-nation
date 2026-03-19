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

-- 5. Add nudge_email_enabled to profiles
--    Controls whether friends can trigger email nudges to this user.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS nudge_email_enabled BOOLEAN DEFAULT true;

-- 6. Friendships table — bidirectional friend relationships
--    requester sends, addressee accepts/rejects. LEAST/GREATEST index
--    prevents duplicate inverse pairs (A→B and B→A).

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester, addressee)
);

-- Prevent duplicate inverse pairs
CREATE UNIQUE INDEX IF NOT EXISTS unique_friendship_pair
  ON friendships (LEAST(requester, addressee), GREATEST(requester, addressee));

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = requester OR auth.uid() = addressee);

CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester AND status = 'pending');

CREATE POLICY "Participants can update friendships"
  ON friendships FOR UPDATE
  USING (auth.uid() = requester OR auth.uid() = addressee);

CREATE POLICY "Participants can delete friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = requester OR auth.uid() = addressee);

-- 7. Friend nudges table — nudge ("get moving") and praise ("nice work")
--    Rate limited to 3 per sender→receiver pair per 24h (enforced app-side).

CREATE TABLE IF NOT EXISTS friend_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('nudge', 'praise')),
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_friend_nudges_receiver
  ON friend_nudges(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_nudges_rate_limit
  ON friend_nudges(sender_id, receiver_id, created_at);

ALTER TABLE friend_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own nudges"
  ON friend_nudges FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send nudges"
  ON friend_nudges FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receiver can mark nudges read"
  ON friend_nudges FOR UPDATE
  USING (auth.uid() = receiver_id);
