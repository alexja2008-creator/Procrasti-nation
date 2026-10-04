// Runs the v2 migration scripts against real Postgres (PGlite, in-process):
// schema twice, backfill twice, RLS and ownership checks as a signed-in user,
// schools/teacher visibility, then rollback and re-apply.
//
// Baselines: the committed stand-in (test/v1-schema.sql) always, plus the real
// production structure when supabase/v2/.local/prod-schema.sql exists
// (created by scripts/dump-prod-schema.sh; gitignored).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const sql = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const STAND_IN = readFileSync(new URL('./v1-schema.sql', import.meta.url), 'utf8');
const PROD_DUMP = new URL('../.local/prod-schema.sql', import.meta.url);

// What Supabase provides that a public-schema dump assumes.
const SUPABASE_STUB = `
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN;
  GRANT USAGE ON SCHEMA auth TO authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
`;

const baselines = [{ name: 'stand-in schema', load: (db) => db.exec(STAND_IN) }];
if (existsSync(PROD_DUMP)) {
  baselines.push({
    name: 'production structure',
    load: async (db) => {
      const dump = readFileSync(PROD_DUMP, 'utf8')
        .replace(/^\\(un)?restrict .*$/gm, '') // pg_dump 18 psql-only guards
        .replace(/^CREATE SCHEMA public;$/m, '');
      await db.exec(SUPABASE_STUB);
      await db.exec(dump);
      // The dump's session settings (empty search_path, row_security = off) would leak into the tests.
      await db.exec(`RESET ALL`);
    },
  });
}

const U1 = '00000000-0000-0000-0000-000000000001';
const U2 = '00000000-0000-0000-0000-000000000002';
const U3 = '00000000-0000-0000-0000-000000000003'; // teacher, when the schools tables exist
const U4 = '00000000-0000-0000-0000-000000000004';
const TASK_A = '0000000a-0000-0000-0000-000000000000';
const TASK_B = '0000000b-0000-0000-0000-000000000000';
const TASK_C = '0000000c-0000-0000-0000-000000000000';
const TASK_D = '0000000d-0000-0000-0000-000000000000';
const TASK_E = '0000000e-0000-0000-0000-000000000000'; // assignment task (schools)

// Shapes seen in production (prod-stats.sql, 2026-10-03): steps carry
// completedAt, some have no `completed` flag, estimates include "N-N min".
const STEPS_A = [
  { id: 1, title: 'Open the doc', description: 'Name it WWI paper', estimatedTime: '5 min', when: 'today', completed: true, completedAt: '2026-09-29T14:05:00.000Z' },
  { id: 2, title: 'Outline', estimatedTime: '1.5 hours', when: 'tomorrow', completed: false },
  { id: 7, title: '  ', estimatedTime: '1h 30m', completed: false },
  { id: 8, title: 'Find sources', estimatedTime: '10-15 min', when: 'thursday', completedAt: '2026-09-30T09:00:00Z' },
];
// A finished v1 task whose steps never got a `completed` flag.
const STEPS_C = [
  { id: 1, title: 'Draft', estimatedTime: '20 min' },
  { id: 2, title: 'Send', estimatedTime: '5 min', completed: false },
];

const one = async (db, q, params) => (await db.query(q, params)).rows[0];
const rows = async (db, q, params) => (await db.query(q, params)).rows;
const hasSchools = async (db) => (await one(db, `SELECT to_regclass('public.assignments') IS NOT NULL AS ok`)).ok;

async function seed(db) {
  // Inserted out of signup order on purpose: citizen numbers follow created_at.
  await db.query(
    `INSERT INTO auth.users (id, email, created_at) VALUES
      ($1, 'b@x.test', '2025-02-01'), ($2, 'a@x.test', '2025-01-01'), ($3, 'c@x.test', '2025-03-01')`,
    [U2, U1, U3],
  );
  await db.query(
    `INSERT INTO tasks (id, user_id, title, status, steps, step_dates, due_date, recurrence, created_at) VALUES
      ($1, $2, 'History paper', 'in_progress', $3, $4, '2026-10-02T00:00:00Z', '{"type":"weekly","startDate":"2026-09-01"}', '2026-09-01')`,
    [TASK_A, U1, JSON.stringify(STEPS_A), JSON.stringify({ 1: '2026-09-30', 2: '2026-02-30', 7: 'garbage' })],
  );
  await db.query(`INSERT INTO tasks (id, user_id, title, steps) VALUES ($1, $2, 'No steps', NULL)`, [TASK_B, U1]);
  await db.query(
    `INSERT INTO tasks (id, user_id, title, status, steps, completed_at) VALUES ($1, $2, 'Done thing', 'completed', $3, '2026-09-28T12:00:00Z')`,
    [TASK_C, U2, JSON.stringify(STEPS_C)],
  );
  await db.query(
    `INSERT INTO tasks (id, user_id, title, steps) VALUES ($1, $2, 'Odd steps', $3)`,
    [TASK_D, U2, JSON.stringify([{ id: 'x', title: 'Only real step', estimatedTime: '20' }, 'not an object'])],
  );

  if (await hasSchools(db)) {
    // U3 teaches a class; U2 got an assignment task from it.
    const org = await one(db, `INSERT INTO organizations (name, created_by) VALUES ('Test High', $1) RETURNING id`, [U3]);
    const cls = await one(db, `INSERT INTO classes (org_id, teacher_id, name) VALUES ($1, $2, 'History 110') RETURNING id`, [org.id, U3]);
    const tpl = await one(db, `INSERT INTO assignment_templates (class_id, teacher_id, title) VALUES ($1, $2, 'Essay') RETURNING id`, [cls.id, U3]);
    const asg = await one(
      db,
      `INSERT INTO assignments (template_id, class_id, due_date, assigned_by) VALUES ($1, $2, '2026-10-20', $3) RETURNING id`,
      [tpl.id, cls.id, U3],
    );
    await db.query(
      `INSERT INTO tasks (id, user_id, title, source, assignment_id, steps) VALUES ($1, $2, 'Assigned essay', 'assignment', $3, $4)`,
      [TASK_E, U2, asg.id, JSON.stringify([{ id: 1, title: 'Read the prompt', estimatedTime: '10 min' }])],
    );
  }
}

async function applyV2(db) {
  await db.exec(sql('01_schema.sql'));
  // Supabase grants table/sequence access to `authenticated` by default.
  await db.exec(`
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
  `);
}

async function as(db, userId, fn) {
  await db.exec(`SET ROLE authenticated`);
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId]);
  try {
    return await fn();
  } finally {
    await db.exec(`RESET ROLE`);
    await db.query(`SELECT set_config('request.jwt.claim.sub', '', false)`);
  }
}

const tasksColumns = async (db) =>
  (await rows(db, `SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position`))
    .map((c) => c.column_name);

for (const baseline of baselines) {
  test(`v2 migration on ${baseline.name}`, async (t) => {
    const db = new PGlite();
    await baseline.load(db);
    await seed(db);
    const schools = await hasSchools(db);
    const v1Columns = await tasksColumns(db);
    const v1Tasks = schools ? 5 : 4;
    const v1Steps = schools ? 8 : 7; // A: 4, C: 2, D: 1 object (+1 assignment step)

    await t.test('schema is idempotent and numbers citizens by signup order', async () => {
      await applyV2(db);
      await applyV2(db);
      const numbers = await rows(db, `SELECT user_id, citizen_number FROM user_settings ORDER BY citizen_number`);
      assert.deepEqual(numbers.map((r) => [r.user_id, Number(r.citizen_number)]), [[U1, 1], [U2, 2], [U3, 3]]);
    });

    await t.test('backfill converts v1 steps into child rows', async () => {
      const result = (await db.exec(sql('02_backfill.sql'))).at(-1).rows[0];
      assert.deepEqual(result, { tasks_converted: v1Tasks, steps_created: v1Steps });

      const children = await rows(
        db,
        `SELECT title, notes, status, completed_at IS NOT NULL AS done, estimate_minutes, scheduled_on::text,
                legacy_step_index, source, user_id
           FROM tasks WHERE parent_id = $1 ORDER BY sort_order`,
        [TASK_A],
      );
      assert.deepEqual(children, [
        { title: 'Open the doc', notes: 'Name it WWI paper', status: 'completed', done: true, estimate_minutes: 5, scheduled_on: '2026-09-30', legacy_step_index: 1, source: 'ai', user_id: U1 },
        { title: 'Outline', notes: null, status: 'in_progress', done: false, estimate_minutes: 90, scheduled_on: null, legacy_step_index: 2, source: 'ai', user_id: U1 },
        { title: 'Step 3', notes: null, status: 'in_progress', done: false, estimate_minutes: 90, scheduled_on: null, legacy_step_index: 3, source: 'ai', user_id: U1 },
        { title: 'Find sources', notes: null, status: 'completed', done: true, estimate_minutes: 15, scheduled_on: null, legacy_step_index: 4, source: 'ai', user_id: U1 },
      ]);

      const doneAt = await rows(
        db,
        `SELECT legacy_step_index AS i, completed_at FROM tasks WHERE parent_id = $1 AND completed_at IS NOT NULL ORDER BY 1`,
        [TASK_A],
      );
      assert.deepEqual(
        doneAt.map((r) => [r.i, r.completed_at.toISOString()]),
        [[1, '2026-09-29T14:05:00.000Z'], [4, '2026-09-30T09:00:00.000Z']],
        "steps keep v1's own completedAt",
      );

      const c = await rows(db, `SELECT status, completed_at FROM tasks WHERE parent_id = $1 ORDER BY sort_order`, [TASK_C]);
      assert.deepEqual(
        c.map((r) => [r.status, r.completed_at.toISOString()]),
        [['completed', '2026-09-28T12:00:00.000Z'], ['completed', '2026-09-28T12:00:00.000Z']],
        "a completed task's steps count as done even without a completed flag",
      );

      const a = await one(db, `SELECT due_on::text, rrule, source, steps FROM tasks WHERE id = $1`, [TASK_A]);
      assert.equal(a.due_on, '2026-10-02');
      assert.equal(a.rrule, 'FREQ=WEEKLY');
      assert.equal(a.source, 'self', "a parent keeps its own source; only steps are 'ai'");
      assert.deepEqual(a.steps, STEPS_A, 'v1 steps JSONB is untouched');

      const b = await one(db, `SELECT source, due_on, rrule FROM tasks WHERE id = $1`, [TASK_B]);
      assert.deepEqual(b, { source: 'self', due_on: null, rrule: null });

      const d = await rows(db, `SELECT title, estimate_minutes FROM tasks WHERE parent_id = $1`, [TASK_D]);
      assert.deepEqual(d, [{ title: 'Only real step', estimate_minutes: 20 }], 'non-object steps are skipped');
    });

    await t.test('backfill is idempotent', async () => {
      const again = await one(db, `SELECT * FROM v2_backfill_tasks()`);
      assert.deepEqual(again, { tasks_converted: 0, steps_created: 0 });
    });

    await t.test('assignment tasks keep their source and stay visible to the teacher', { skip: !schools }, async () => {
      const e = await one(db, `SELECT source FROM tasks WHERE id = $1`, [TASK_E]);
      assert.equal(e.source, 'assignment');
      await as(db, U3, async () => {
        const seen = await rows(db, `SELECT id FROM tasks WHERE id = $1`, [TASK_E]);
        assert.equal(seen.length, 1, 'the teacher policy still matches after the migration');
      });
    });

    await t.test('RLS and ownership checks hold for a signed-in user', async () => {
      await as(db, U1, async () => {
        const visible = await rows(db, `SELECT user_id FROM tasks`);
        assert.equal(visible.length, 6); // A, B and A's four steps
        assert.ok(visible.every((r) => r.user_id === U1));

        await assert.rejects(
          db.query(`INSERT INTO tasks (user_id, title, parent_id) VALUES ($1, 'sneaky', $2)`, [U1, TASK_C]),
          /parent task .* not found/,
          "can't attach a subtask to another user's task",
        );
        await assert.rejects(
          db.query(`INSERT INTO lists (user_id, name) VALUES ($1, 'Theirs')`, [U2]),
          /row-level security/,
        );

        const list = await one(db, `INSERT INTO lists (user_id, name, kind) VALUES ($1, 'History 110', 'school') RETURNING id`, [U1]);
        const task = await one(
          db,
          `INSERT INTO tasks (user_id, title, list_id, source) VALUES ($1, 'Read ch. 4', $2, 'syllabus') RETURNING id`,
          [U1, list.id],
        );
        await assert.rejects(
          db.query(`INSERT INTO notes (user_id, task_id, body) VALUES ($1, $2, 'x')`, [U1, TASK_C]),
          /task .* not found/,
        );
        await db.query(`INSERT INTO notes (user_id, task_id, list_id, body) VALUES ($1, $2, $3, 'pages 40-60')`, [U1, task.id, list.id]);

        const child = await one(db, `SELECT id FROM tasks WHERE parent_id = $1 LIMIT 1`, [TASK_A]);
        await assert.rejects(
          db.query(`INSERT INTO tasks (user_id, title, parent_id) VALUES ($1, 'grandchild', $2)`, [U1, child.id]),
          /parent task .* not found/,
          'nesting stays one level deep',
        );
        await assert.rejects(db.query(`UPDATE tasks SET parent_id = $1 WHERE id = $2`, [task.id, TASK_A]), /has subtasks/);

        await db.query(`UPDATE user_settings SET citizen_number = 999, timezone = 'America/New_York' WHERE user_id = $1`, [U1]);
        const mine = await one(db, `SELECT citizen_number, timezone FROM user_settings WHERE user_id = $1`, [U1]);
        assert.equal(Number(mine.citizen_number), 1, 'citizen numbers never change');
        assert.equal(mine.timezone, 'America/New_York');
        assert.equal((await rows(db, `SELECT 1 FROM user_settings WHERE user_id <> $1`, [U1])).length, 0);
      });

      await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'd@x.test')`, [U4]);
      await as(db, U4, async () => {
        const created = await one(db, `INSERT INTO user_settings (user_id, citizen_number) VALUES ($1, 1) RETURNING citizen_number`, [U4]);
        assert.equal(Number(created.citizen_number), 4, 'new users get the next number, whatever they send');
      });
    });

    await t.test('plan generations can be logged and counted, never erased', async () => {
      await as(db, U1, async () => {
        await db.query(`INSERT INTO plan_generations (user_id, task_id) VALUES ($1, $2)`, [U1, TASK_A]);
        await db.query(`INSERT INTO plan_generations (user_id) VALUES ($1)`, [U1]);
        await assert.rejects(
          db.query(`INSERT INTO plan_generations (user_id, task_id) VALUES ($1, $2)`, [U1, TASK_C]),
          /task .* not found/,
          "can't log against another user's task",
        );
        await assert.rejects(db.query(`INSERT INTO plan_generations (user_id) VALUES ($1)`, [U2]), /row-level security/);

        const deleted = await db.query(`DELETE FROM plan_generations WHERE user_id = $1`, [U1]);
        assert.equal(deleted.affectedRows, 0, 'no delete policy: the count cannot be reset');
        const count = await one(db, `SELECT count(*)::int AS n FROM plan_generations WHERE created_at >= date_trunc('month', now())`);
        assert.equal(count.n, 2);
      });
      await as(db, U2, async () => {
        assert.equal((await one(db, `SELECT count(*)::int AS n FROM plan_generations`)).n, 0, "others' generations are invisible");
      });
    });

    await t.test('rollback restores v1 exactly and can be re-applied', async () => {
      await db.exec(sql('99_rollback.sql'));

      assert.deepEqual(await tasksColumns(db), v1Columns, 'same columns, same order (source is kept)');
      const remaining = await rows(db, `SELECT title, source FROM tasks ORDER BY title`);
      const expected = [
        ...(schools ? [{ title: 'Assigned essay', source: 'assignment' }] : []),
        { title: 'Done thing', source: 'self' },
        { title: 'History paper', source: 'self' },
        { title: 'No steps', source: 'self' },
        { title: 'Odd steps', source: 'self' },
        { title: 'Read ch. 4', source: 'self' }, // v2-only source mapped back
      ];
      assert.deepEqual(remaining, expected);
      assert.deepEqual((await one(db, `SELECT steps FROM tasks WHERE id = $1`, [TASK_A])).steps, STEPS_A);
      await assert.rejects(
        db.query(`INSERT INTO tasks (user_id, title, source) VALUES ($1, 'x', 'ai')`, [U1]),
        /tasks_source_check/,
        'the v1 source values are enforced again',
      );
      const leftovers = await rows(
        db,
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
           AND table_name IN ('lists', 'notes', 'stamps', 'start_sessions', 'push_tokens', 'user_settings', 'plan_generations')`,
      );
      assert.deepEqual(leftovers, []);

      await applyV2(db);
      const result = (await db.exec(sql('02_backfill.sql'))).at(-1).rows[0];
      assert.deepEqual(result, { tasks_converted: v1Tasks + 1, steps_created: v1Steps });
    });

    await db.close();
  });
}
