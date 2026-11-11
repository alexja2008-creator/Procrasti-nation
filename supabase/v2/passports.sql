-- Read-only: who is using PN and when. One row per passport, newest activity
-- first: who it is, how far they got, what they've done and on which days.
-- Run in the PRODUCTION SQL Editor. SELECT only: changes nothing.
--
-- Unlike funnel.sql this prints email addresses, so the result is personal
-- data: read it in the SQL Editor, and don't paste it into the repo (it's
-- public), an issue or a chat. To share it, leave the `email` column out;
-- `citizen` says which row is which.
--
-- No task titles, plan steps or notes: what someone wrote isn't shown here,
-- only how much and when.
--
-- Reading the columns:
-- - `citizen`: the passport's number. `email`: its address once saved,
--   'link sent to …' while a save link is out, 'unsaved' otherwise. An unsaved
--   passport isn't a new person for sure: a second device, a reinstall or a
--   signed-out browser leaves one too.
-- - `opened`, `last_active` and `active_on` are in New York time (`since` is a
--   UTC day, so a first row can read the evening before).
-- - `heard_from` and `stops_them` are the Application's answers; a value the
--   app doesn't offer reads 'unrecognized'.
-- - `reminders`: 'web' when a browser has reminders on now. The iPhone schedules
--   its reminders on the phone and leaves no row, so blank doesn't mean off there.
-- - `plans_built`: the planner made one. `plans_kept`: plans still there.
--   `steps_done` / `steps`: those plans' steps.
-- - `starts`: Start Mode sessions, and `starts_done` those that ended in Done.
-- - `last_active` and `active_on` come from what leaves a row (a task added
--   or finished, a plan or its questions, a start, "I'm stuck"). Opening the
--   app and only reading leaves no trace. `active_on` lists each day, oldest
--   first.
--
-- Set `since` to the first day to count, in UTC (the default is launch day).

WITH params AS (
  SELECT DATE '2026-10-14' AS since, 'America/New_York' AS zone
),
passports AS (
  SELECT
    u.id,
    u.created_at,
    s.citizen_number,
    CASE
      WHEN NOT coalesce(u.is_anonymous, false) THEN coalesce(u.email, 'saved, no email')
      WHEN coalesce(u.email_change, '') <> '' THEN 'link sent to ' || u.email_change
      ELSE 'unsaved'
    END AS email,
    -- People can write their own settings, so only the app's own answers are
    -- printed (packages/core/src/types.ts); anything else reads 'unrecognized'.
    CASE
      WHEN s.preferences->>'heardFrom' IN ('tiktok', 'instagram', 'youtube', 'reddit', 'friend', 'appStore', 'other')
        THEN s.preferences->>'heardFrom'
      WHEN coalesce(s.preferences->>'heardFrom', '') <> '' THEN 'unrecognized'
    END AS heard_from,
    CASE
      WHEN s.preferences->>'style' IN ('avoid', 'perfectionist', 'overwhelmed', 'bored') THEN s.preferences->>'style'
      WHEN coalesce(s.preferences->>'style', '') <> '' THEN 'unrecognized'
    END AS stops_them,
    s.onboarding_completed_at IS NOT NULL AS approved
  FROM auth.users u
  -- The app makes the settings row when it first loads, so an account may have none yet.
  LEFT JOIN user_settings s ON s.user_id = u.id
  CROSS JOIN params
  WHERE u.created_at >= (params.since::timestamp AT TIME ZONE 'UTC')
),
activity AS (
  SELECT t.user_id, t.created_at::timestamptz AS at FROM tasks t JOIN passports p ON p.id = t.user_id
  UNION ALL
  SELECT t.user_id, t.completed_at::timestamptz FROM tasks t JOIN passports p ON p.id = t.user_id
    WHERE t.completed_at IS NOT NULL
  UNION ALL
  SELECT g.user_id, g.created_at FROM plan_generations g JOIN passports p ON p.id = g.user_id
  UNION ALL
  SELECT x.user_id, x.started_at FROM start_sessions x JOIN passports p ON p.id = x.user_id
  UNION ALL
  SELECT r.user_id, r.created_at FROM ai_requests r JOIN passports p ON p.id = r.user_id
),
days AS (
  SELECT DISTINCT a.user_id, (a.at AT TIME ZONE params.zone)::date AS day
  FROM activity a CROSS JOIN params
),
-- The planner's steps still there, under a plan still there.
steps AS (
  SELECT t.user_id, t.parent_id, t.completed_at
  FROM tasks t
  JOIN passports p ON p.id = t.user_id
  JOIN tasks parent ON parent.id = t.parent_id AND parent.deleted_at IS NULL
  WHERE t.source = 'ai' AND t.parent_id IS NOT NULL AND t.deleted_at IS NULL
)
SELECT
  p.citizen_number AS citizen,
  p.email,
  to_char(p.created_at AT TIME ZONE params.zone, 'Mon DD HH24:MI') AS opened,
  p.heard_from,
  p.stops_them,
  p.approved,
  (SELECT string_agg(DISTINCT k.platform, ', ') FROM push_tokens k WHERE k.user_id = p.id) AS reminders,
  (SELECT count(*) FROM plan_generations g WHERE g.user_id = p.id) AS plans_built,
  (SELECT count(DISTINCT s.parent_id) FROM steps s WHERE s.user_id = p.id) AS plans_kept,
  (SELECT count(s.completed_at) FROM steps s WHERE s.user_id = p.id) AS steps_done,
  (SELECT count(*) FROM steps s WHERE s.user_id = p.id) AS steps,
  (SELECT count(*) FROM start_sessions x WHERE x.user_id = p.id) AS starts,
  (SELECT count(*) FROM start_sessions x WHERE x.user_id = p.id AND x.outcome = 'done') AS starts_done,
  (SELECT to_char(max(a.at) AT TIME ZONE params.zone, 'Mon DD HH24:MI') FROM activity a WHERE a.user_id = p.id) AS last_active,
  (SELECT string_agg(to_char(d.day, 'Mon DD'), ', ' ORDER BY d.day) FROM days d WHERE d.user_id = p.id) AS active_on
FROM passports p
CROSS JOIN params
ORDER BY (SELECT max(a.at) FROM activity a WHERE a.user_id = p.id) DESC NULLS LAST, p.created_at DESC;
