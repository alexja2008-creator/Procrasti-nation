// Runs the v2 migration scripts against real Postgres (PGlite, in-process)
// on a stand-in of the v1 schema: schema twice, backfill twice, RLS and
// ownership checks as a signed-in user, then rollback and re-apply.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const sql = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const V1 = readFileSync(new URL('./v1-schema.sql', import.meta.url), 'utf8');

const U1 = '00000000-0000-0000-0000-000000000001';
const U2 = '00000000-0000-0000-0000-000000000002';
const U3 = '00000000-0000-0000-0000-000000000003';
const U4 = '00000000-0000-0000-0000-000000000004';
const TASK_A = '0000000a-0000-0000-0000-000000000000';
const TASK_B = '0000000b-0000-0000-0000-000000000000';
const TASK_C = '0000000c-0000-0000-0000-000000000000';
const TASK_D = '0000000d-0000-0000-0000-000000000000';

const STEPS_A = [
  { id: 1, title: 'Open the doc', description: 'Name it WWI paper', estimatedTime: '5 min', when: 'today', completed: true },
  { id: 2, title: 'Outline', estimatedTime: '1.5 hours', when: 'tomorrow', completed: false },
  { id: 7, title: '  ', estimatedTime: '1h 30m', completed: false },
];

async function seed(db) {
  await db.exec(V1);
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
    `INSERT INTO tasks (id, user_id, title, status, steps, completed_at) VALUES ($1, $2, 'Done thing', 'completed', '[]', now())`,
    [TASK_C, U2],
  );
  await db.query(
    `INSERT INTO tasks (id, user_id, title, steps) VALUES ($1, $2, 'Odd steps', $3)`,
    [TASK_D, U2, JSON.stringify([{ id: 'x', title: 'Only real step', estimatedTime: '20' }, 'not an object'])],
  );
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

const one = async (db, q, params) => (await db.query(q, params)).rows[0];
const rows = async (db, q, params) => (await db.query(q, params)).rows;

test('v2 migration: schema, backfill, RLS, rollback', async (t) => {
  const db = new PGlite();
  await seed(db);

  await t.test('schema is idempotent and numbers citizens by signup order', async () => {
    await applyV2(db);
    await applyV2(db);
    const numbers = await rows(db, `SELECT user_id, citizen_number FROM user_settings ORDER BY citizen_number`);
    assert.deepEqual(numbers.map((r) => [r.user_id, Number(r.citizen_number)]), [[U1, 1], [U2, 2], [U3, 3]]);
  });

  await t.test('backfill converts v1 steps into child rows', async () => {
    const result = (await db.exec(sql('02_backfill.sql'))).at(-1).rows[0];
    assert.deepEqual(result, { tasks_converted: 4, steps_created: 4 });

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
    ]);

    const a = await one(db, `SELECT due_on::text, rrule, source, steps FROM tasks WHERE id = $1`, [TASK_A]);
    assert.equal(a.due_on, '2026-10-02');
    assert.equal(a.rrule, 'FREQ=WEEKLY');
    assert.equal(a.source, 'ai');
    assert.deepEqual(a.steps, STEPS_A, 'v1 steps JSONB is untouched');

    const b = await one(db, `SELECT source, due_on, rrule FROM tasks WHERE id = $1`, [TASK_B]);
    assert.deepEqual(b, { source: 'manual', due_on: null, rrule: null });

    const d = await rows(db, `SELECT title, estimate_minutes FROM tasks WHERE parent_id = $1`, [TASK_D]);
    assert.deepEqual(d, [{ title: 'Only real step', estimate_minutes: 20 }], 'non-object steps are skipped');
  });

  await t.test('backfill is idempotent', async () => {
    const again = await one(db, `SELECT * FROM v2_backfill_tasks()`);
    assert.deepEqual(again, { tasks_converted: 0, steps_created: 0 });
  });

  await t.test('RLS and ownership checks hold for a signed-in user', async () => {
    await as(db, U1, async () => {
      const visible = await rows(db, `SELECT user_id FROM tasks`);
      assert.equal(visible.length, 5);
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
      const task = await one(db, `INSERT INTO tasks (user_id, title, list_id) VALUES ($1, 'Read ch. 4', $2) RETURNING id`, [U1, list.id]);
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
      await assert.rejects(
        db.query(`UPDATE tasks SET parent_id = $1 WHERE id = $2`, [task.id, TASK_A]),
        /has subtasks/,
      );

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

  await t.test('rollback restores v1 and can be re-applied', async () => {
    await db.exec(sql('99_rollback.sql'));

    const columns = await rows(db, `SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position`);
    assert.deepEqual(
      columns.map((c) => c.column_name),
      ['id', 'user_id', 'title', 'description', 'status', 'steps', 'completed_steps', 'total_steps', 'start_time', 'completed_at',
        'due_date', 'priority', 'recurrence', 'step_dates', 'start_commitment', 'first_interaction_at', 'last_nudge_sent', 'created_at', 'updated_at'],
    );
    const remaining = await rows(db, `SELECT title FROM tasks ORDER BY title`);
    assert.deepEqual(remaining.map((r) => r.title), ['Done thing', 'History paper', 'No steps', 'Odd steps', 'Read ch. 4']);
    assert.deepEqual((await one(db, `SELECT steps FROM tasks WHERE id = $1`, [TASK_A])).steps, STEPS_A);
    const leftovers = await rows(
      db,
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
         AND table_name IN ('lists', 'notes', 'stamps', 'start_sessions', 'push_tokens', 'user_settings')`,
    );
    assert.deepEqual(leftovers, []);

    await applyV2(db);
    const result = (await db.exec(sql('02_backfill.sql'))).at(-1).rows[0];
    assert.deepEqual(result, { tasks_converted: 5, steps_created: 4 });
  });

  await db.close();
});
