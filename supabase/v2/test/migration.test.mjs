// Runs the v2 migration scripts against real Postgres (PGlite, in-process):
// schema twice, backfill twice, RLS and ownership checks as a signed-in user,
// schools/teacher visibility, then rollback and re-apply.
//
// Baselines: the committed stand-in (test/v1-schema.sql) always, plus the real
// production structure when supabase/v2/.local/prod-schema.sql exists
// (created by scripts/dump-prod-schema.sh; gitignored). Each baseline also
// gets the fixes run on production since that dump (PROD_FIXES).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const sql = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const STAND_IN = readFileSync(new URL('./v1-schema.sql', import.meta.url), 'utf8');
const PROD_DUMP = new URL('../.local/prod-schema.sql', import.meta.url);

// Production fixes from supabase/migrations/, in the order they're run there.
// Idempotent, and re-run on a newer dump too (pg_dump leaves out grants).
const PROD_FIXES = ['profiles_billing_1_before_deploy.sql', 'profiles_billing_2_after_deploy.sql'].map((name) =>
  readFileSync(new URL(`../../migrations/${name}`, import.meta.url), 'utf8'),
);

// What Supabase provides that a public-schema dump assumes, including its
// default grants: new tables, sequences and functions in public are open to
// the API roles, and RLS and explicit REVOKEs narrow that.
const SUPABASE_STUB = `
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
`;

const applyProdFixes = async (db) => {
  for (const fix of PROD_FIXES) await db.exec(fix);
};

const baselines = [
  {
    name: 'stand-in schema',
    load: async (db) => {
      await db.exec(SUPABASE_STUB);
      await db.exec(STAND_IN);
      await applyProdFixes(db);
    },
  },
];
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
      await applyProdFixes(db);
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
const OTHERS_NOTE = '000000f0-0000-0000-0000-000000000000'; // U2's note

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

// New tables get Supabase's default grants (SUPABASE_STUB), so nothing is
// granted here: a blanket GRANT would also undo production's REVOKEs.
async function applyV2(db) {
  await db.exec(sql('01_schema.sql'));
}

// Runs fn as an API caller: a signed-in user by default; role 'anon' for
// signed-out, 'service_role' for the site's server routes.
async function as(db, userId, fn, role = 'authenticated') {
  await db.exec(`SET ROLE ${role}`);
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

    await t.test("profiles: Stripe fields are the server's; API callers read only the public profile", async () => {
      await applyProdFixes(db); // a second run changes nothing
      await db.query(
        `INSERT INTO profiles (user_id, username, stripe_customer_id, stripe_subscription_status) VALUES
          ($1, 'ada', 'cus_ada', 'canceled'), ($2, 'bo', 'cus_bo', 'active')`,
        [U1, U2],
      );

      await as(db, U1, async () => {
        const renamed = await db.query(`UPDATE profiles SET display_name = 'Ada L.' WHERE user_id = $1`, [U1]);
        assert.equal(renamed.affectedRows, 1, 'the public fields stay editable');
        await assert.rejects(
          db.query(`UPDATE profiles SET stripe_subscription_status = 'active' WHERE user_id = $1`, [U1]),
          /billing fields are set by the server/,
          "can't make yourself Pro",
        );
        await assert.rejects(
          db.query(`UPDATE profiles SET stripe_customer_id = 'cus_bo' WHERE user_id = $1`, [U1]),
          /billing fields are set by the server/,
          "can't take over someone else's Stripe customer (and their billing portal)",
        );
        assert.deepEqual(await rows(db, `SELECT username, display_name FROM profiles ORDER BY username`), [
          { username: 'ada', display_name: 'Ada L.' },
          { username: 'bo', display_name: null },
        ]);
        for (const column of ['stripe_subscription_status', 'stripe_customer_id', 'email_reports_enabled', '*']) {
          await assert.rejects(db.query(`SELECT ${column} FROM profiles`), /permission denied/, `${column} is not readable`);
        }
        assert.equal((await one(db, `SELECT my_subscription_status() AS s`)).s, 'canceled', 'but your own status is');
      });

      await as(db, U3, async () => {
        await assert.rejects(
          db.query(`INSERT INTO profiles (user_id, username, stripe_subscription_status) VALUES ($1, 'cy', 'active')`, [U3]),
          /billing fields are set by the server/,
          'not on a new profile either',
        );
        await db.query(`INSERT INTO profiles (user_id, username, display_name) VALUES ($1, 'cy', 'cy')`, [U3]);
        assert.equal((await one(db, `SELECT my_subscription_status() AS s`)).s, null);
      });

      await as(db, '', async () => {
        assert.equal((await rows(db, `SELECT username FROM profiles`)).length, 3, 'public profiles stay public');
        await assert.rejects(db.query(`SELECT stripe_subscription_status FROM profiles`), /permission denied/);
        await assert.rejects(db.query(`SELECT my_subscription_status()`), /permission denied/);
      }, 'anon');

      // The Stripe routes (service role): checkout stores the customer, the webhook sets the status.
      await as(db, '', async () => {
        await db.query(`UPDATE profiles SET stripe_customer_id = 'cus_cy' WHERE user_id = $1`, [U3]);
        const updated = await db.query(`UPDATE profiles SET stripe_subscription_status = 'active' WHERE stripe_customer_id = 'cus_ada'`);
        assert.equal(updated.affectedRows, 1);
      }, 'service_role');
      await as(db, U1, async () => {
        assert.equal((await one(db, `SELECT my_subscription_status() AS s`)).s, 'active');
      });

      const columns = await rows(
        db,
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' ORDER BY 1`,
      );
      assert.deepEqual(
        columns.map((c) => c.column_name),
        ['created_at', 'display_name', 'email_reminders_enabled', 'email_reports_enabled', 'id', 'nudge_email_enabled',
          'stripe_customer_id', 'stripe_subscription_status', 'user_id', 'username'],
        'a column this check has not seen: decide whether the API may read it (supabase/migrations/profiles_billing_2_after_deploy.sql)',
      );
    });

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
      await db.query(`INSERT INTO notes (id, user_id, body) VALUES ($1, $2, 'Theirs')`, [OTHERS_NOTE, U2]);
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

        // Live checklist lines: a task can belong to the user's own note, never someone else's.
        const packing = await one(db, `INSERT INTO notes (user_id, body) VALUES ($1, 'Packing') RETURNING id`, [U1]);
        const sunscreen = await one(
          db,
          `INSERT INTO tasks (user_id, title, note_id) VALUES ($1, 'Sunscreen', $2) RETURNING id, note_id`,
          [U1, packing.id],
        );
        assert.equal(sunscreen.note_id, packing.id);
        await assert.rejects(
          db.query(`INSERT INTO tasks (user_id, title, note_id) VALUES ($1, 'sneaky', $2)`, [U1, OTHERS_NOTE]),
          /note .* not found/,
          "can't put a checklist line in another user's note",
        );
        await assert.rejects(db.query(`UPDATE tasks SET note_id = $1 WHERE id = $2`, [OTHERS_NOTE, sunscreen.id]), /note .* not found/);
        await db.query(`DELETE FROM notes WHERE id = $1`, [packing.id]);
        assert.equal((await one(db, `SELECT note_id FROM tasks WHERE id = $1`, [sunscreen.id])).note_id, null, 'the task outlives its note');

        // Note counts per territory: only the user's own live notes.
        await db.query(`INSERT INTO notes (user_id, body) VALUES ($1, 'Loose'), ($1, 'Also loose')`, [U1]);
        await db.query(`INSERT INTO notes (user_id, body, deleted_at) VALUES ($1, 'Trashed', now())`, [U1]);
        const counts = await rows(db, `SELECT list_id, notes FROM note_counts ORDER BY list_id NULLS LAST`);
        assert.deepEqual(counts, [
          { list_id: list.id, notes: 1 },
          { list_id: null, notes: 2 },
        ], "not U2's note, not the trashed one");

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

    await t.test('AI requests can be logged and counted, never erased', async () => {
      await as(db, U1, async () => {
        await db.query(`INSERT INTO ai_requests (user_id, kind) VALUES ($1, 'unstick')`, [U1]);
        for (const kind of ['clarify', 'plan']) {
          await db.query(`INSERT INTO ai_requests (user_id, kind) VALUES ($1, $2)`, [U1, kind]);
        }
        await assert.rejects(db.query(`INSERT INTO ai_requests (user_id, kind) VALUES ($1, 'anything')`, [U1]), /ai_requests_kind_check/);
        await assert.rejects(db.query(`INSERT INTO ai_requests (user_id, kind) VALUES ($1, 'unstick')`, [U2]), /row-level security/);
        const deleted = await db.query(`DELETE FROM ai_requests WHERE user_id = $1`, [U1]);
        assert.equal(deleted.affectedRows, 0, 'no delete policy: a daily cap cannot be reset');
        const updated = await db.query(`UPDATE ai_requests SET created_at = now() - interval '2 days' WHERE user_id = $1`, [U1]);
        assert.equal(updated.affectedRows, 0, 'no update policy: rows cannot be backdated out of the window');
        const count = await one(db, `SELECT count(*)::int AS n FROM ai_requests WHERE kind = 'unstick' AND created_at > now() - interval '1 day'`);
        assert.equal(count.n, 1);
      });
      await as(db, U2, async () => {
        assert.equal((await one(db, `SELECT count(*)::int AS n FROM ai_requests`)).n, 0, "others' requests are invisible");
      });
    });

    await t.test('Start Mode: sessions count, the first-start stamp is earned once', async () => {
      await as(db, U1, async () => {
        const session = await one(
          db,
          `INSERT INTO start_sessions (user_id, task_id, planned_minutes) VALUES ($1, $2, 5) RETURNING id`,
          [U1, TASK_A],
        );
        await db.query(`UPDATE start_sessions SET ended_at = now(), outcome = 'done' WHERE id = $1`, [session.id]);
        await assert.rejects(
          db.query(`INSERT INTO start_sessions (user_id, task_id, planned_minutes) VALUES ($1, $2, 5)`, [U1, TASK_C]),
          /task .* not found/,
          "can't start another user's task",
        );
        await db.query(`INSERT INTO stamps (user_id, kind) VALUES ($1, 'first-start')`, [U1]);
        await assert.rejects(db.query(`INSERT INTO stamps (user_id, kind) VALUES ($1, 'first-start')`, [U1]), /stamps_once_idx/);
        await db.query(`INSERT INTO stamps (user_id, kind) VALUES ($1, 'citizenship')`, [U1]);
        await assert.rejects(db.query(`INSERT INTO stamps (user_id, kind) VALUES ($1, 'citizenship')`, [U1]), /stamps_once_idx/, 'the Application is approved once');
        await db.query(`INSERT INTO stamps (user_id, task_id, kind) VALUES ($1, $2, 'task-done')`, [U1, TASK_A]);
        await db.query(`INSERT INTO stamps (user_id, task_id, kind) VALUES ($1, $2, 'task-done')`, [U1, TASK_A]);
        const kinds = await rows(db, `SELECT kind, count(*)::int AS n FROM stamps GROUP BY kind ORDER BY kind`);
        assert.deepEqual(
          kinds,
          [{ kind: 'citizenship', n: 1 }, { kind: 'first-start', n: 1 }, { kind: 'task-done', n: 2 }],
          'done stamps repeat; milestones do not',
        );
      });
      await as(db, U2, async () => {
        await db.query(`INSERT INTO stamps (user_id, kind) VALUES ($1, 'first-start')`, [U2]);
        assert.equal((await one(db, `SELECT count(*)::int AS n FROM start_sessions`)).n, 0, "others' sessions are invisible");
      });
    });

    await t.test('web push: a browser belongs to one account; the send log and snoozes are server only', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/browser-1';
      const owners = async () =>
        (await rows(db, `SELECT user_id, keys FROM push_tokens WHERE token = $1`, [endpoint])).map((r) => [r.user_id, r.keys.auth]);

      await as(db, U1, async () => {
        await db.query(`SELECT save_web_push($1, 'p1', 'a1')`, [endpoint]);
        await db.query(`SELECT save_web_push($1, 'p1', 'a2')`, [endpoint]); // keys refreshed, still one row
        await assert.rejects(db.query(`SELECT save_web_push('http://insecure.test/x', 'p', 'a')`), /not a push subscription/);
        await assert.rejects(db.query(`SELECT save_web_push($1, '', 'a')`, [endpoint]), /not a push subscription/);
        await assert.rejects(
          db.query(`INSERT INTO push_tokens (user_id, platform, token) VALUES ($1, 'web', 'https://x.test/no-keys')`, [U1]),
          /push_tokens_web_keys/,
          'a web subscription needs its keys',
        );
        await db.query(`INSERT INTO push_tokens (user_id, platform, token) VALUES ($1, 'ios', 'ExponentPushToken[x]')`, [U1]);
      });
      assert.deepEqual(await owners(), [[U1, 'a2']]);

      await as(db, U2, async () => {
        assert.equal((await one(db, `SELECT count(*)::int AS n FROM push_tokens`)).n, 0, "others' browsers are invisible");
        await assert.rejects(
          db.query(`INSERT INTO push_tokens (user_id, platform, token, keys) VALUES ($1, 'web', $2, '{"p256dh":"p","auth":"a"}')`, [U2, endpoint]),
          /push_tokens_web_endpoint_idx/,
          'a plain insert cannot take a browser another account holds',
        );
        // Signing in on the same browser takes it over: U1's reminders stop ringing here.
        await db.query(`SELECT save_web_push($1, 'p2', 'b1')`, [endpoint]);
      });
      assert.deepEqual(await owners(), [[U2, 'b1']]);
      assert.equal((await one(db, `SELECT count(*)::int AS n FROM push_tokens WHERE user_id = $1`, [U1])).n, 1, "U1's iPhone token stays");

      await as(db, '', async () => {
        await assert.rejects(db.query(`SELECT save_web_push($1, 'p', 'a')`, [endpoint]), /not signed in/);
      });
      await as(db, U1, async () => {
        await assert.rejects(db.query(`INSERT INTO push_sends (user_id, reminder_id) VALUES ($1, 'task:x:1')`, [U1]), /row-level security/);
        await assert.rejects(
          db.query(`INSERT INTO push_snoozes (user_id, task_id, ring_at, title) VALUES ($1, $2, now(), 'x')`, [U1, TASK_A]),
          /row-level security/,
        );
      });
      // The sender (service role, here the table owner) logs each send once.
      await db.query(`INSERT INTO push_sends (user_id, reminder_id) VALUES ($1, 'task:x:1')`, [U1]);
      const again = await db.query(`INSERT INTO push_sends (user_id, reminder_id) VALUES ($1, 'task:x:1') ON CONFLICT DO NOTHING RETURNING reminder_id`, [U1]);
      assert.equal(again.rows.length, 0, 'a second claim of the same reminder gets nothing');
      await db.query(`INSERT INTO push_snoozes (user_id, task_id, ring_at, day, title) VALUES ($1, $2, now(), '2026-10-07', 'History paper')`, [U1, TASK_A]);
    });

    await t.test("search finds the signed-in user's own tasks and notes, nothing else", async () => {
      const chem = (await one(db, `INSERT INTO lists (user_id, name) VALUES ($1, 'Chem 201') RETURNING id`, [U1])).id;
      const add = async ({ user = U1, title, notes = null, list = null, parent = null, done = false, deleted = false }) =>
        (
          await one(
            db,
            `INSERT INTO tasks (user_id, title, notes, list_id, parent_id, status, completed_at, deleted_at)
             VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $7 THEN now() END, CASE WHEN $8 THEN now() END) RETURNING id`,
            [user, title, notes, list, parent, done ? 'completed' : 'in_progress', done, deleted],
          )
        ).id;
      const report = await add({ title: 'Chemistry lab report', list: chem });
      await add({ title: 'Read chapter 4', notes: 'pages 40-60, bring the handout' });
      await add({ title: 'Print the handout' });
      await add({ title: 'Lab notebook' });
      await add({ title: 'Lab safety quiz', done: true });
      await add({ title: 'Lab coat order', deleted: true });
      await add({ user: U2, title: 'Lab partner list' });
      const plan = await add({ title: 'Lab practical prep', list: chem });
      await add({ title: 'Review the lab manual', parent: plan });
      await db.query(
        `INSERT INTO notes (user_id, list_id, body) VALUES
           ($1, NULL, $2), ($1, $3, 'Bring goggles to lab'), ($4, NULL, 'Lab notes of theirs')`,
        [U1, `Lecture 7\nKrebs cycle is on the midterm.\n[[task:${report}]]`, chem, U2],
      );

      try {
        await as(db, U1, async () => {
          const find = async (query, kind, list = null, max = 26, skip = 0) =>
            rows(db, `SELECT item->>'title' AS title, item->>'body' AS body, snippet FROM search_items($1, $2, $3, $4, $5)`, [
              query, kind, list, max, skip,
            ]);
          const titles = async (...args) => (await find(...args)).map((r) => r.title).sort();

          assert.deepEqual(await titles('chem', 'open'), ['Chemistry lab report'], 'a word matches as a prefix, after stemming');
          assert.deepEqual(await titles('read ch.', 'open'), ['Read ch. 4', 'Read chapter 4'], 'punctuation is ignored');
          const handout = await find('handout', 'open');
          assert.deepEqual(handout.map((r) => r.title), ['Print the handout', 'Read chapter 4'], 'a title match ranks above a Notes match');
          assert.equal(handout[0].snippet, null);
          assert.match(handout[1].snippet, /«handout»/, 'a Notes-field match comes with a snippet');

          assert.deepEqual(
            await titles('lab', 'open'),
            ['Chemistry lab report', 'Lab notebook', 'Lab practical prep', 'Review the lab manual'],
            "open only: not the finished, deleted or someone else's",
          );
          assert.deepEqual(await titles('lab', 'done'), ['Lab safety quiz']);
        const step = await one(db, `SELECT item->>'parent_title' AS plan FROM search_items('manual', 'open')`);
        assert.equal(step.plan, 'Lab practical prep', 'a step carries its plan’s title');
          assert.deepEqual(
            await titles('lab', 'open', chem),
            ['Chemistry lab report', 'Lab practical prep', 'Review the lab manual'],
            "a territory includes its plans' steps",
          );
          const first = await find('lab', 'open', null, 2, 0);
          const second = await find('lab', 'open', null, 2, 2);
          assert.equal(new Set([...first, ...second].map((r) => r.title)).size, 4, 'pages add up without repeats');
        assert.equal((await find('lab', 'open', null, 100000, -5)).length, 4, 'page size is capped and offsets floored');

          const krebs = await find('krebs', 'notes');
          assert.equal(krebs.length, 1);
          assert.match(krebs[0].snippet, /«Krebs»/);
        assert.doesNotMatch(krebs[0].snippet, /Lecture/, 'the snippet comes from under the title');
        assert.equal((await find('goggles', 'notes'))[0].snippet, null, 'a title-only match needs no snippet');
          assert.deepEqual(await find('task', 'notes'), [], 'checklist tokens are never matched');
          assert.deepEqual(await find(report.slice(0, 8), 'notes'), []);
          assert.deepEqual((await find('lab', 'notes')).map((r) => r.body), ['Bring goggles to lab'], "not someone else's note");
          assert.deepEqual(await find('lab', 'notes', chem), (await find('lab', 'notes')));

          assert.deepEqual(await find("'); DROP TABLE tasks; --", 'open'), [], 'typed input is only ever words');
          assert.deepEqual(await find('the', 'open'), [], 'only stop words: nothing to search');
          assert.deepEqual(await find('   ', 'notes'), []);
          await assert.rejects(find('lab', 'stamps'), /unknown search kind/);
        });
        if (schools) {
          await as(db, U3, async () => {
            assert.equal((await rows(db, `SELECT 1 FROM tasks WHERE id = $1`, [TASK_E])).length, 1, 'a teacher can read the assignment task');
            assert.deepEqual(await rows(db, `SELECT id FROM search_items('essay', 'open')`), [], "but search only looks at the teacher's own");
          });
        }
      } finally {
        // Leave the fixtures as the rollback test expects them.
        await db.query(`DELETE FROM notes WHERE body LIKE '%Krebs%' OR body IN ('Bring goggles to lab', 'Lab notes of theirs')`);
        await db.query(`DELETE FROM tasks WHERE parent_id = $1`, [plan]);
        await db.query(
          `DELETE FROM tasks WHERE title IN ('Chemistry lab report', 'Read chapter 4', 'Print the handout', 'Lab notebook',
             'Lab safety quiz', 'Lab coat order', 'Lab partner list', 'Lab practical prep')`,
        );
        await db.query(`DELETE FROM lists WHERE id = $1`, [chem]);
      }
    });

    await t.test("deleting an account takes every row of theirs, and nothing of anyone else's", async () => {
      // The account route deletes the auth user; every table pointing at a person must follow.
      const U9 = '00000000-0000-0000-0000-000000000009';
      await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'leaving@x.test')`, [U9]);
      await db.query(`INSERT INTO user_settings (user_id) VALUES ($1)`, [U9]);
      const list = await one(db, `INSERT INTO lists (user_id, name) VALUES ($1, 'Chem') RETURNING id`, [U9]);
      const note = await one(db, `INSERT INTO notes (user_id, list_id, body) VALUES ($1, $2, 'Lab') RETURNING id`, [U9, list.id]);
      const plan = await one(db, `INSERT INTO tasks (user_id, list_id, title) VALUES ($1, $2, 'Essay') RETURNING id`, [U9, list.id]);
      const step = await one(db, `INSERT INTO tasks (user_id, parent_id, title) VALUES ($1, $2, 'Outline') RETURNING id`, [U9, plan.id]);
      await db.query(`INSERT INTO tasks (user_id, note_id, title) VALUES ($1, $2, 'Goggles')`, [U9, note.id]);
      await db.query(`INSERT INTO stamps (user_id, kind, task_id, list_id) VALUES ($1, 'task-done', $2, $3)`, [U9, step.id, list.id]);
      await db.query(`INSERT INTO start_sessions (user_id, task_id, planned_minutes, outcome) VALUES ($1, $2, 5, 'done')`, [U9, step.id]);
      await db.query(`INSERT INTO plan_generations (user_id, task_id) VALUES ($1, $2)`, [U9, plan.id]);
      await db.query(`INSERT INTO ai_requests (user_id, kind) VALUES ($1, 'plan')`, [U9]);
      await db.query(`INSERT INTO push_tokens (user_id, platform, token) VALUES ($1, 'ios', 'leaving-device')`, [U9]);
      await db.query(`INSERT INTO profiles (user_id, username) VALUES ($1, 'leaving')`, [U9]);

      // Every (table, column) with a foreign key to auth.users, so tables added later are covered too.
      const refs = await rows(
        db,
        `SELECT c.conrelid::regclass::text AS tbl, a.attname AS col
           FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
          WHERE c.contype = 'f' AND c.confrelid = 'auth.users'::regclass`,
      );
      const count = async (where) => {
        const out = {};
        for (const { tbl, col } of refs) out[`${tbl}.${col}`] = (await one(db, `SELECT count(*)::int AS n FROM ${tbl} WHERE ${col} ${where}`, [U9])).n;
        return out;
      };
      const theirs = await count('= $1');
      assert.ok(Object.values(theirs).filter((n) => n > 0).length >= 10, 'the departing user has rows across the tables');
      const others = await count('IS DISTINCT FROM $1');

      await db.query(`DELETE FROM auth.users WHERE id = $1`, [U9]);

      const left = await count('= $1');
      assert.deepEqual(Object.entries(left).filter(([, n]) => n > 0), [], 'nothing of theirs is left anywhere');
      assert.deepEqual(await count('IS DISTINCT FROM $1'), others, "everyone else's rows are untouched");
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
        { title: 'Sunscreen', source: 'self' }, // a checklist task stays a task
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
           AND table_name IN ('lists', 'notes', 'note_counts', 'stamps', 'start_sessions', 'push_tokens', 'push_sends', 'push_snoozes',
                              'user_settings', 'plan_generations', 'ai_requests')`,
      );
      assert.deepEqual(leftovers, []);

      await applyV2(db);
      const result = (await db.exec(sql('02_backfill.sql'))).at(-1).rows[0];
      assert.deepEqual(result, { tasks_converted: v1Tasks + 2, steps_created: v1Steps });
    });

    await t.test('the v2 migration and its rollback keep the profiles lock', async () => {
      await as(db, U1, async () => {
        await assert.rejects(
          db.query(`UPDATE profiles SET stripe_customer_id = 'cus_bo' WHERE user_id = $1`, [U1]),
          /billing fields are set by the server/,
        );
        await assert.rejects(db.query(`SELECT stripe_subscription_status FROM profiles`), /permission denied/);
        assert.equal((await one(db, `SELECT my_subscription_status() AS s`)).s, 'active');
      });
    });

    await db.close();
  });
}
