-- Read-only: what new passports answered to "Where did you hear about us?" (the
-- Application's page just before the Oath), for the funnel model's "Said TikTok"
-- and "Said Instagram" (docs/external.md, Funnel model and post log). Run in the
-- PRODUCTION SQL Editor and paste the single JSON result back. SELECT only:
-- changes nothing. Counts only: no names, emails or ids.
--
-- Reading the numbers:
-- - A passport is an account, anonymous ones included; deleted accounts are gone.
--   It isn't a person: a second device or a reinstall can leave an extra
--   anonymous passport, and test passports count too.
-- - `signed_up` is what the funnel model counts as a sign-up: saved, or a save
--   link is out (the app's `needsSave` is false).
-- - `saved`: no longer anonymous (the save link was opened, or Apple or Google).
-- - `no_answer`: none saved. An Apple or Google sign-up that used Skip on
--   Welcome, or answers that never reached the passport (rare: a new applicant's
--   passport opens only once they've answered).
-- - `unrecognized`: a value the app doesn't offer. People can write their own
--   settings, so anything else is counted here, never printed. An answer the app
--   adds later shows here until it's added to the list below.
-- - Answers are self-reported: a jump in one answer with no `signed_up` deserves
--   a second look.
--
-- Set `since` to the first day to count, in UTC: the beta's start, or the first
-- post's day (the default, launch day, includes the family testers' passports).
-- Edit it in the SQL Editor.

WITH params AS (
  SELECT DATE '2026-10-14' AS since
),
known(answer, ord) AS (
  -- The app's answers in its order (packages/core/src/nation.ts, heardFrom).
  VALUES ('tiktok', 1), ('instagram', 2), ('youtube', 3), ('reddit', 4),
    ('friend', 5), ('appStore', 6), ('other', 7), ('no_answer', 8), ('unrecognized', 9)
),
passports AS (
  SELECT
    CASE
      WHEN coalesce(s.preferences->>'heardFrom', '') = '' THEN 'no_answer'
      WHEN s.preferences->>'heardFrom' IN (SELECT answer FROM known WHERE ord <= 7) THEN s.preferences->>'heardFrom'
      ELSE 'unrecognized'
    END AS answer,
    NOT coalesce(u.is_anonymous, false) AS saved,
    NOT coalesce(u.is_anonymous, false) OR coalesce(u.email_change, '') <> '' AS signed_up
  FROM auth.users u
  -- The app makes the settings row when it first loads, so an account may have none yet.
  LEFT JOIN user_settings s ON s.user_id = u.id
  CROSS JOIN params
  WHERE u.created_at >= (params.since::timestamp AT TIME ZONE 'UTC')
)
SELECT json_build_object(
  'since', (SELECT since FROM params),
  'passports', (SELECT count(*) FROM passports),
  'signed_up', (SELECT count(*) FROM passports WHERE signed_up),
  'saved', (SELECT count(*) FROM passports WHERE saved),
  'by_answer', (
    SELECT json_object_agg(k.answer, json_build_object(
      'passports', (SELECT count(*) FROM passports p WHERE p.answer = k.answer),
      'signed_up', (SELECT count(*) FROM passports p WHERE p.answer = k.answer AND p.signed_up),
      'saved', (SELECT count(*) FROM passports p WHERE p.answer = k.answer AND p.saved)
    ) ORDER BY k.ord)
    FROM known k
  )
) AS heard_from;
