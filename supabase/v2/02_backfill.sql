-- ============================================================
-- ProcrastiNation 2.0 — v1 → v2 task backfill
--
-- Run ONCE AT CUTOVER (after 01_schema.sql), when the v1 site is retired.
-- Running it while v1 is live would make v1 show each step as its own
-- task, because v1 lists every row in `tasks`.
--
-- Defines v2_backfill_tasks(), then calls it. It is idempotent: re-running
-- converts only rows that haven't been converted. It only ADDS rows and
-- fills v2 columns; v1 columns (steps, step_dates, recurrence, due_date)
-- are never modified, so 99_rollback.sql restores v1 exactly.
--
-- Mapping:
--   steps[i]           → child row (parent_id = task, legacy_step_index = i)
--     .title           → title          .description → notes
--     .estimatedTime   → estimate_minutes ("15 min", "1 hour", "1.5 hours";
--                        ranges like "10-15 min" take the upper bound)
--     done when .completed is true, .completedAt is set, or the parent task
--     is completed (some v1 steps carry no .completed flag at all)
--                      → status 'completed', completed_at = .completedAt when
--                        valid, else the parent's completed_at/updated_at
--     step_dates[.id]  → scheduled_on
--     (source 'ai'; the parent keeps its own source, so 'assignment' tasks
--      stay visible to their teacher)
--   due_date           → due_on (v1 stored dates as midnight UTC)
--   recurrence.type    → rrule (daily/weekly/monthly)
-- ============================================================

-- "YYYY-MM-DD" → DATE, or NULL for anything that isn't a valid date.
CREATE OR REPLACE FUNCTION v2_try_date(value TEXT)
RETURNS DATE AS $$
BEGIN
  IF value IS NULL OR value !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN NULL;
  END IF;
  RETURN value::date;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ISO timestamp text (v1's step.completedAt) → TIMESTAMPTZ, or NULL if unreadable.
CREATE OR REPLACE FUNCTION v2_try_timestamptz(value TEXT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN NULL;
  END IF;
  RETURN value::timestamptz;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- v1 estimate strings → minutes: "15 min", "45 mins", "1 hour", "1.5 hours",
-- "2 hrs", "1h 30m". NULL when there's no number.
CREATE OR REPLACE FUNCTION v2_parse_minutes(value TEXT)
RETURNS INTEGER AS $$
DECLARE
  v TEXT := lower(coalesce(value, ''));
  hours NUMERIC := coalesce(substring(v FROM '(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\M')::numeric, 0);
  mins NUMERIC := coalesce(substring(v FROM '(\d+)\s*(?:m|min|mins|minute|minutes)\M')::numeric, 0);
  bare NUMERIC := substring(v FROM '^\s*(\d+)\s*$')::numeric;
  total INTEGER;
BEGIN
  total := round(hours * 60 + mins + coalesce(bare, 0));
  RETURN CASE WHEN total > 0 THEN total END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION v2_backfill_tasks()
RETURNS TABLE (tasks_converted INTEGER, steps_created INTEGER) AS $$
DECLARE
  created INTEGER;
  converted INTEGER;
BEGIN
  INSERT INTO tasks (
    user_id, parent_id, title, notes, status, completed_at,
    estimate_minutes, scheduled_on, sort_order, source,
    legacy_step_index, v1_backfilled_at, created_at,
    steps, completed_steps, total_steps
  )
  SELECT
    t.user_id,
    t.id,
    coalesce(nullif(btrim(s.step->>'title'), ''), 'Step ' || s.ord),
    nullif(btrim(s.step->>'description'), ''),
    CASE WHEN d.done THEN 'completed' ELSE 'in_progress' END,
    CASE WHEN d.done THEN coalesce(d.step_completed_at, t.completed_at, t.updated_at, now()) END,
    v2_parse_minutes(s.step->>'estimatedTime'),
    v2_try_date(t.step_dates->>(s.step->>'id')),
    s.ord,
    'ai',
    s.ord,
    now(),
    t.created_at,
    '[]'::jsonb, 0, 0
  FROM tasks t
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(t.steps) = 'array' THEN t.steps ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS s(step, ord)
  CROSS JOIN LATERAL (
    SELECT
      v2_try_timestamptz(s.step->>'completedAt') AS step_completed_at,
      s.step->>'completed' = 'true'
        OR v2_try_timestamptz(s.step->>'completedAt') IS NOT NULL
        OR t.status = 'completed' AS done
  ) d
  WHERE t.parent_id IS NULL
    AND t.v1_backfilled_at IS NULL
    AND jsonb_typeof(s.step) = 'object'
  ON CONFLICT (parent_id, legacy_step_index) WHERE legacy_step_index IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS created = ROW_COUNT;

  UPDATE tasks t SET
    due_on = coalesce(t.due_on, (t.due_date AT TIME ZONE 'UTC')::date),
    rrule = coalesce(t.rrule, CASE t.recurrence->>'type'
      WHEN 'daily' THEN 'FREQ=DAILY'
      WHEN 'weekly' THEN 'FREQ=WEEKLY'
      WHEN 'monthly' THEN 'FREQ=MONTHLY'
    END),
    v1_backfilled_at = now()
  WHERE t.parent_id IS NULL
    AND t.v1_backfilled_at IS NULL;
  GET DIAGNOSTICS converted = ROW_COUNT;

  RETURN QUERY SELECT converted, created;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM v2_backfill_tasks();
