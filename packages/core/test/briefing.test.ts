import assert from 'node:assert/strict';
import test from 'node:test';

import { briefingOf, carriedOver, dayPatch, letGoPatch, respreadPatches, todayPatch, undoPatch } from '../src/briefing.ts';
import { atLocalTime } from '../src/dates.ts';
import type { Task } from '../src/types.ts';

const TODAY = '2026-10-08';

const base: Task = {
  id: 'x', userId: 'u', listId: null, parentId: null, noteId: null, title: 'x', notes: null, status: 'in_progress',
  dueOn: null, dueAt: null, remindAt: null, rrule: null, estimateMinutes: null, scheduledOn: null, sortOrder: 0,
  source: 'self', externalId: null, completedAt: null, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', deletedAt: null,
};
const task = (fields: Partial<Task>): Task => ({ ...base, title: fields.id ?? 'x', ...fields });

test('what carried over: an open one-off whose chosen day has passed', () => {
  const carried = (fields: Partial<Task>) => carriedOver(task(fields), TODAY);
  assert.equal(carried({ scheduledOn: '2026-10-07' }), true, 'scheduled yesterday');
  assert.equal(carried({ dueOn: '2026-10-03' }), true, 'no day, deadline passed');
  assert.equal(carried({ scheduledOn: '2026-10-07', dueOn: '2026-10-20' }), true, 'its day passed, deadline ahead');
  assert.equal(carried({ scheduledOn: TODAY }), false, 'today');
  assert.equal(carried({ scheduledOn: TODAY, dueOn: '2026-10-03' }), false, 'already given today, deadline passed');
  assert.equal(carried({ scheduledOn: '2026-10-12', dueOn: '2026-10-03' }), false, 'given a later day');
  assert.equal(carried({ dueOn: TODAY }), false, 'due today');
  assert.equal(carried({}), false, 'no date at all');
  assert.equal(carried({ scheduledOn: '2026-10-07', rrule: 'FREQ=DAILY' }), false, 'a repeat');
  assert.equal(carried({ scheduledOn: '2026-10-07', completedAt: '2026-10-07T20:00:00Z', status: 'completed' }), false, 'done');
  assert.equal(carried({ scheduledOn: '2026-10-07', deletedAt: '2026-10-07T20:00:00Z' }), false, 'deleted');
});

test('the briefing groups a plan’s missed steps under it and lists the rest, oldest first', () => {
  const tasks = [
    task({ id: 'essay', dueOn: '2026-10-03' }),
    task({ id: 'stamps', scheduledOn: '2026-10-06' }),
    task({ id: 'walk', scheduledOn: '2026-10-07', rrule: 'FREQ=DAILY' }),
    task({ id: 'chem', dueOn: '2026-10-14' }),
    task({ id: 'c1', parentId: 'chem', scheduledOn: '2026-10-05', sortOrder: 1, source: 'ai' }),
    task({ id: 'c2', parentId: 'chem', scheduledOn: '2026-10-06', sortOrder: 2, source: 'ai', completedAt: '2026-10-06T18:00:00Z', status: 'completed' }),
    task({ id: 'c3', parentId: 'chem', scheduledOn: '2026-10-07', sortOrder: 3, source: 'ai' }),
    task({ id: 'c4', parentId: 'chem', scheduledOn: '2026-10-10', sortOrder: 4, source: 'ai' }),
    task({ id: 'room', scheduledOn: '2026-10-01' }),
    task({ id: 'r1', parentId: 'room', scheduledOn: '2026-10-09', source: 'ai' }),
  ];
  const b = briefingOf(tasks, TODAY);
  assert.deepEqual(b.plans.map((p) => p.plan.id), ['chem']);
  assert.deepEqual(b.plans[0].steps.map((t) => t.id), ['c1', 'c3']);
  assert.deepEqual(b.plans[0].open.map((t) => t.id), ['c1', 'c3', 'c4']);
  // "room" has an open step ahead, so it's sorted through its plan, not on its own.
  assert.deepEqual(b.loose.map((t) => t.id), ['essay', 'stamps']);
  assert.equal(b.count, 4);
  assert.equal(briefingOf([task({ id: 'new', scheduledOn: TODAY })], TODAY).count, 0);
});

test('Today keeps the time; Pick a day and Let it go clear a deadline that passed', () => {
  const timed = task({ scheduledOn: '2026-10-07', remindAt: atLocalTime('2026-10-07', 15, 30), dueOn: '2026-10-03' });
  assert.deepEqual(todayPatch(timed, TODAY), { scheduledOn: TODAY, remindAt: atLocalTime(TODAY, 15, 30) });

  assert.deepEqual(dayPatch(timed, TODAY, '2026-10-10', { hour: 9, minute: 0 }), {
    scheduledOn: '2026-10-10', remindAt: atLocalTime('2026-10-10', 9, 0), dueOn: null, dueAt: null,
  });
  assert.deepEqual(dayPatch(timed, TODAY, TODAY, null), { scheduledOn: TODAY, remindAt: null }, 'picking today keeps it, like Today');

  assert.deepEqual(letGoPatch(timed, TODAY), { scheduledOn: null, remindAt: null, dueOn: null, dueAt: null });
  const ahead = task({ scheduledOn: '2026-10-07', dueOn: '2026-10-20' });
  assert.deepEqual(letGoPatch(ahead, TODAY), { scheduledOn: null, remindAt: null }, 'a deadline ahead stays');
});

test('Re-spread the rest spaces a plan’s open steps from today to its deadline, in order', () => {
  const steps = [
    task({ id: 's1', parentId: 'p', scheduledOn: '2026-10-05' }),
    task({ id: 's2', parentId: 'p', scheduledOn: '2026-10-06', remindAt: atLocalTime('2026-10-06', 19, 0) }),
    task({ id: 's3', parentId: 'p', scheduledOn: '2026-10-14' }),
  ];
  const spread = respreadPatches({ dueOn: '2026-10-14' }, steps, TODAY);
  assert.deepEqual(
    spread.map(({ task: t, patch }) => [t.id, patch.scheduledOn, patch.remindAt]),
    [
      ['s1', TODAY, null],
      ['s2', '2026-10-11', atLocalTime('2026-10-11', 19, 0)],
      // s3 is already on the deadline: no write.
    ],
  );
  const noDeadline = respreadPatches({ dueOn: '2026-10-01' }, steps, TODAY);
  assert.deepEqual(noDeadline.map(({ patch }) => patch.scheduledOn), [TODAY, '2026-10-09', '2026-10-10'], 'a passed deadline: one a day');
});

test('Undo writes back exactly the fields a patch changed', () => {
  const t = task({ scheduledOn: '2026-10-07', remindAt: atLocalTime('2026-10-07', 15, 30), dueOn: '2026-10-03', title: 'Essay' });
  assert.deepEqual(undoPatch(t, letGoPatch(t, TODAY)), { scheduledOn: '2026-10-07', remindAt: t.remindAt, dueOn: '2026-10-03', dueAt: null });
});
