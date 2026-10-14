-- Read-only snapshot of how v1 task data is shaped, to check 02_backfill.sql
-- against reality without copying anyone's data. Run in the PRODUCTION SQL
-- Editor and paste the single JSON result back. SELECT only: changes nothing.
-- Returns counts and anonymized patterns only (digits become N); no titles,
-- emails or ids.

WITH t AS (
  SELECT * FROM tasks
),
steps AS (
  SELECT s.step, s.ord, t.step_dates
  FROM t
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(t.steps) = 'array' THEN t.steps ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS s(step, ord)
)
SELECT json_build_object(
  'tasks_total', (SELECT count(*) FROM t),
  'steps_type', (SELECT json_object_agg(coalesce(k, 'null'), n) FROM (
      SELECT jsonb_typeof(steps) AS k, count(*) AS n FROM t GROUP BY 1) x),
  'steps_total', (SELECT count(*) FROM steps),
  'steps_not_objects', (SELECT count(*) FROM steps WHERE jsonb_typeof(step) <> 'object'),
  'step_keys', (SELECT json_object_agg(k, n) FROM (
      SELECT key AS k, count(*) AS n FROM steps, jsonb_object_keys(
        CASE WHEN jsonb_typeof(step) = 'object' THEN step ELSE '{}'::jsonb END) AS key
      GROUP BY 1) x),
  'step_id_not_number', (SELECT count(*) FROM steps
      WHERE jsonb_typeof(step) = 'object' AND coalesce(step->>'id', '') !~ '^\d+$'),
  'step_completed_values', (SELECT json_object_agg(coalesce(k, 'missing'), n) FROM (
      SELECT step->>'completed' AS k, count(*) AS n FROM steps
      WHERE jsonb_typeof(step) = 'object' GROUP BY 1) x),
  'estimate_patterns', (SELECT json_object_agg(p, n) FROM (
      SELECT regexp_replace(lower(coalesce(step->>'estimatedTime', '<missing>')), '\d+(\.\d+)?', 'N', 'g') AS p,
             count(*) AS n
      FROM steps WHERE jsonb_typeof(step) = 'object'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 40) x),
  'step_dates_type', (SELECT json_object_agg(coalesce(k, 'null'), n) FROM (
      SELECT jsonb_typeof(step_dates) AS k, count(*) AS n FROM t GROUP BY 1) x),
  'step_date_values_not_dates', (SELECT count(*) FROM t, jsonb_each_text(
      CASE WHEN jsonb_typeof(t.step_dates) = 'object' THEN t.step_dates ELSE '{}'::jsonb END) AS d
      WHERE d.value !~ '^\d{4}-\d{2}-\d{2}$'),
  'status_values', (SELECT json_object_agg(coalesce(status, 'null'), n) FROM (
      SELECT status, count(*) AS n FROM t GROUP BY 1) x),
  'recurrence_types', (SELECT json_object_agg(coalesce(k, 'none'), n) FROM (
      SELECT recurrence->>'type' AS k, count(*) AS n FROM t GROUP BY 1) x),
  'due_date_set', (SELECT count(*) FROM t WHERE due_date IS NOT NULL),
  'due_date_not_utc_midnight', (SELECT count(*) FROM t
      WHERE due_date IS NOT NULL AND (due_date AT TIME ZONE 'UTC')::time <> '00:00'),
  'users_with_tasks', (SELECT count(DISTINCT user_id) FROM t),
  'auth_users', (SELECT count(*) FROM auth.users)
) AS v1_shape;
