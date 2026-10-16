-- Read-only: how often Plan it's steps tell people to set an alarm, use the
-- phone's Reminders, or use another reminder or to-do app
-- (docs/plans/shipped/dates-and-repeats.md, Phase 5). Run in the PRODUCTION
-- SQL Editor and paste the single JSON result back. SELECT only: changes nothing.
-- Counts only: no titles, notes, emails or ids.
--
-- The pattern is the plan-quality eval's OTHER_REMINDER
-- (apps/site/evals/plan-quality/run.mjs), in Postgres's dialect (\y is a word
-- boundary). As there, it looks at each sentence of a step's title and notes,
-- and a sentence that names ProcrastiNation doesn't count. Putting an
-- appointment in the calendar is allowed, so calendars aren't counted.
--
-- Reading the numbers:
-- - `plans` counts tasks that were planned: a re-plan's steps sit under the
--   same task, and the replaced steps still count (the planner wrote them).
-- - A step someone renamed or edited still counts as the planner's words.
-- - Deleted accounts' steps are gone with them.
--
-- Set `since` to the day the beta started. Edit it in the SQL Editor; don't
-- commit a date in the future (npm run db:test runs this file with today's rows).

WITH params AS (
  SELECT DATE '2026-10-14' AS since
),
steps AS (
  SELECT t.id, t.parent_id, t.user_id, t.title || '. ' || coalesce(t.notes, '') AS text
  FROM tasks t, params
  WHERE t.source = 'ai' AND t.parent_id IS NOT NULL AND t.created_at >= params.since
),
flagged AS (
  -- One row per step. Its kind comes from its first flagged sentence; within a
  -- sentence the CASE order decides (alarm, other app, reminders app, set a reminder).
  SELECT DISTINCT ON (s.id)
    s.id,
    s.parent_id,
    CASE
      WHEN x.sentence ~* '\yalarms?\y' THEN 'alarm'
      WHEN x.sentence ~* '\y(?:to-?do (?:list )?apps?|todoist|ticktick|any\.do|google tasks|microsoft to do)\y' THEN 'other app'
      WHEN x.sentence ~* '\y(?:reminders? apps?|(?:phone''?s|apple|google) reminders|(?:to|in) (?:your )?reminders)\y' THEN 'reminders app'
      ELSE 'set a reminder'
    END AS kind
  FROM steps s, regexp_split_to_table(s.text, '(?<=[.!?])\s+') WITH ORDINALITY AS x(sentence, n)
  WHERE x.sentence NOT LIKE '%ProcrastiNation%'
    AND x.sentence ~* '\y(?:alarms?|(?:set|add|create|schedule|put)(?: up)?(?: yourself)? (?:a |an )?(?:[\w-]+ ){0,2}reminders?|reminders? apps?|(?:phone''?s|apple|google) reminders|(?:to|in) (?:your )?reminders|to-?do (?:list )?apps?|todoist|ticktick|any\.do|google tasks|microsoft to do)\y'
  ORDER BY s.id, x.n
)
SELECT json_build_object(
  'since', (SELECT since FROM params),
  'people_with_plans', (SELECT count(DISTINCT user_id) FROM steps),
  'plans', (SELECT count(DISTINCT parent_id) FROM steps),
  'steps', (SELECT count(*) FROM steps),
  'plans_with_this_advice', (SELECT count(DISTINCT parent_id) FROM flagged),
  'percent_of_plans', (SELECT round(100.0 * count(DISTINCT f.parent_id) / nullif((SELECT count(DISTINCT parent_id) FROM steps), 0), 1) FROM flagged f),
  'steps_with_this_advice', (SELECT count(*) FROM flagged),
  'by_kind', (SELECT coalesce(json_object_agg(kind, n), '{}'::json) FROM (SELECT kind, count(*) AS n FROM flagged GROUP BY 1) k)
) AS planner_reminder_advice;
