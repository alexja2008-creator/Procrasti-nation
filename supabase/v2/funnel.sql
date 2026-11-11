-- Read-only: the funnel from a new passport to a first start, whether plans turn
-- into starts, and who comes back. Run in the PRODUCTION SQL Editor and paste the
-- single JSON result back. SELECT only: changes nothing. Counts only: no titles,
-- names, emails or ids.
--
-- The question it answers: does a plan lead to a start? `plans.acted_24h` over
-- `plans.a_day_old` is the number to watch. A plan nobody acts on is planning as
-- one more way to put the thing off.
--
-- Reading the numbers:
-- - A passport is an account, anonymous ones included; deleted accounts are gone.
--   It isn't a person: a second device or a reinstall can leave an extra
--   anonymous passport, and Alex's and the testers' passports count too.
-- - `funnel` counts passports at each stage; the stages aren't strictly in order
--   (someone can start a task before they save). Most are "ever"; four are "as
--   things stand now": `kept_a_plan` (a deleted plan no longer counts), `saved`,
--   `signed_up` and `reminders_on` (signing out removes a device's reminders).
--   - `built_a_plan`: the planner made one (`plan_generations`, the Oath's included).
--   - `kept_a_plan`: its steps were saved as tasks.
--   - `signed_up`: saved, or a save link is out (as in heard-from.sql).
--   - `started`: used Start Mode at all. `started_first_day`: within 24 hours of
--     the passport opening.
--   - `finished_something`: checked off any task or step.
--   - `ai_allowed`: passports that allow the AI now (Settings can turn it off).
--     It reads 0 until the AI consent change ships and
--     `user_settings.ai_consent_at` is on production; passports from before
--     that weren't asked.
-- - `plans` is one row per planned task. A re-plan counts once, timed from the
--   first plan's steps, and a start on a step the re-plan replaced still counts.
--   `steps` and `steps_done` are the steps still there; a deleted plan is left out.
--   - "Acted" means a Start Mode session on the plan or one of its steps, or a
--     step checked off, after the plan was made. `started_*` is Start Mode alone.
--     Un-checking a step takes its "acted" back. Start and finish times come
--     from the device's clock, so they're allowed to be 2 minutes early.
--   - The 24-hour numbers are out of `a_day_old`, the 7-day ones out of
--     `a_week_old`, so a plan made an hour ago doesn't count as ignored.
-- - `came_back`: "activity" is anything that leaves a row (a task added or
--   finished, a plan or its questions, a start, "I'm stuck"). Opening the app and
--   only reading leaves no trace, so these run low.
--   - `after_first_day` is out of `a_day_old`, `after_first_week` out of
--     `a_week_old`: activity after the passport's first 24 hours or 7 days.
--   - `active_last_7_days` and `active_on_3_or_more_days` are out of every
--     passport, new ones and their first day included.
-- - Days are UTC.
--
-- Set `since` to the first day to count, in UTC (the default is launch day).
-- Edit it in the SQL Editor.

WITH params AS (
  SELECT DATE '2026-10-14' AS since
),
passports AS (
  SELECT
    u.id,
    u.created_at,
    NOT coalesce(u.is_anonymous, false) AS saved,
    NOT coalesce(u.is_anonymous, false) OR coalesce(u.email_change, '') <> '' AS signed_up,
    s.onboarding_completed_at IS NOT NULL AS approved,
    -- Through to_jsonb so the query still runs where the column isn't applied yet.
    (to_jsonb(s)->>'ai_consent_at') IS NOT NULL AS ai_allowed,
    coalesce(s.preferences->>'heardFrom', '') <> '' AS answered
  FROM auth.users u
  -- The app makes the settings row when it first loads, so an account may have none yet.
  LEFT JOIN user_settings s ON s.user_id = u.id
  CROSS JOIN params
  WHERE u.created_at >= (params.since::timestamp AT TIME ZONE 'UTC')
),
-- Everything a passport did that leaves a row, as (who, when).
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
returns AS (
  SELECT
    p.id,
    p.created_at,
    count(DISTINCT a.at::date) AS active_days,
    coalesce(bool_or(a.at >= p.created_at + interval '1 day'), false) AS after_day_1,
    coalesce(bool_or(a.at >= p.created_at + interval '7 days'), false) AS after_day_7,
    coalesce(bool_or(a.at >= now() - interval '7 days'), false) AS last_7_days
  FROM passports p
  LEFT JOIN activity a ON a.user_id = p.id
  GROUP BY p.id, p.created_at
),
-- Every step the planner wrote under a plan that's still there, the ones a
-- re-plan replaced (soft-deleted) included: they date the plan and carry its
-- earlier starts.
steps AS (
  SELECT t.id, t.parent_id, t.user_id, t.created_at::timestamptz AS created_at,
    t.completed_at::timestamptz AS completed_at, t.deleted_at IS NULL AS live
  FROM tasks t
  JOIN passports p ON p.id = t.user_id
  JOIN tasks parent ON parent.id = t.parent_id AND parent.deleted_at IS NULL
  WHERE t.source = 'ai' AND t.parent_id IS NOT NULL
),
plan_base AS (
  SELECT parent_id AS id, min(created_at) AS made_at,
    count(*) FILTER (WHERE live) AS steps,
    count(completed_at) FILTER (WHERE live) AS steps_done
  FROM steps
  GROUP BY parent_id
  HAVING count(*) FILTER (WHERE live) > 0
),
plans AS (
  SELECT
    b.*,
    (SELECT min(x.started_at) FROM start_sessions x
      WHERE x.started_at >= b.made_at - interval '2 minutes'
        AND (x.task_id = b.id OR x.task_id IN (SELECT s.id FROM steps s WHERE s.parent_id = b.id))
    ) AS first_start,
    (SELECT min(s.completed_at) FROM steps s
      WHERE s.parent_id = b.id AND s.completed_at >= b.made_at - interval '2 minutes'
    ) AS first_done
  FROM plan_base b
),
plan_times AS (
  SELECT *,
    least(first_start, first_done) AS first_act,
    made_at <= now() - interval '1 day' AS a_day_old,
    made_at <= now() - interval '7 days' AS a_week_old
  FROM plans
)
SELECT json_build_object(
  'since', (SELECT since FROM params),
  'funnel', json_build_object(
    'passports', (SELECT count(*) FROM passports),
    'answered_the_application', (SELECT count(*) FROM passports WHERE answered),
    'ai_allowed', (SELECT count(*) FROM passports WHERE ai_allowed),
    'built_a_plan', (SELECT count(*) FROM passports p
      WHERE EXISTS (SELECT 1 FROM plan_generations g WHERE g.user_id = p.id)),
    'kept_a_plan', (SELECT count(DISTINCT user_id) FROM steps WHERE live),
    'signed_a_declaration', (SELECT count(*) FROM passports p
      WHERE EXISTS (SELECT 1 FROM stamps k WHERE k.user_id = p.id AND k.kind = 'first-declaration')),
    'approved', (SELECT count(*) FROM passports WHERE approved),
    'signed_up', (SELECT count(*) FROM passports WHERE signed_up),
    'saved', (SELECT count(*) FROM passports WHERE saved),
    'reminders_on', (SELECT count(*) FROM passports p
      WHERE EXISTS (SELECT 1 FROM push_tokens k WHERE k.user_id = p.id)),
    'started', (SELECT count(*) FROM passports p
      WHERE EXISTS (SELECT 1 FROM start_sessions x WHERE x.user_id = p.id)),
    'started_first_day', (SELECT count(*) FROM passports p
      WHERE EXISTS (SELECT 1 FROM start_sessions x
        WHERE x.user_id = p.id AND x.started_at < p.created_at + interval '1 day')),
    'finished_something', (SELECT count(*) FROM passports p
      WHERE EXISTS (SELECT 1 FROM tasks t WHERE t.user_id = p.id AND t.completed_at IS NOT NULL)),
    'built_a_second_plan', (SELECT count(*) FROM passports p
      WHERE (SELECT count(*) FROM plan_generations g WHERE g.user_id = p.id) >= 2)
  ),
  'plans', json_build_object(
    'plans', (SELECT count(*) FROM plan_times),
    'a_day_old', (SELECT count(*) FROM plan_times WHERE a_day_old),
    'started_24h', (SELECT count(*) FROM plan_times
      WHERE a_day_old AND first_start < made_at + interval '1 day'),
    'acted_24h', (SELECT count(*) FROM plan_times
      WHERE a_day_old AND first_act < made_at + interval '1 day'),
    'a_week_old', (SELECT count(*) FROM plan_times WHERE a_week_old),
    'acted_7d', (SELECT count(*) FROM plan_times
      WHERE a_week_old AND first_act < made_at + interval '7 days'),
    'never_acted_week_old', (SELECT count(*) FROM plan_times WHERE a_week_old AND first_act IS NULL),
    'every_step_done', (SELECT count(*) FROM plan_times WHERE steps_done = steps),
    'steps', (SELECT coalesce(sum(steps), 0) FROM plan_times),
    'steps_done', (SELECT coalesce(sum(steps_done), 0) FROM plan_times)
  ),
  'start_mode', json_build_object(
    'sessions', (SELECT count(*) FROM start_sessions x JOIN passports p ON p.id = x.user_id),
    'by_outcome', (SELECT coalesce(json_object_agg(outcome, n), '{}'::json) FROM (
      SELECT coalesce(x.outcome, 'unfinished') AS outcome, count(*) AS n
      FROM start_sessions x JOIN passports p ON p.id = x.user_id GROUP BY 1) o),
    'im_stuck_asks', (SELECT count(*) FROM ai_requests r JOIN passports p ON p.id = r.user_id
      WHERE r.kind = 'unstick')
  ),
  'came_back', json_build_object(
    'a_day_old', (SELECT count(*) FROM returns WHERE created_at <= now() - interval '1 day'),
    'after_first_day', (SELECT count(*) FROM returns
      WHERE created_at <= now() - interval '1 day' AND after_day_1),
    'a_week_old', (SELECT count(*) FROM returns WHERE created_at <= now() - interval '7 days'),
    'after_first_week', (SELECT count(*) FROM returns
      WHERE created_at <= now() - interval '7 days' AND after_day_7),
    'active_last_7_days', (SELECT count(*) FROM returns WHERE last_7_days),
    'active_on_3_or_more_days', (SELECT count(*) FROM returns WHERE active_days >= 3)
  )
) AS funnel;
