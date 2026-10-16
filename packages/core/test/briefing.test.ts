import assert from 'node:assert/strict';
import test from 'node:test';

import { dayPatch, letGoPatch, respreadPatches, todayPatch, undoPatch } from '../src/briefing.ts';
import { atLocalTime } from '../src/dates.ts';
import { voice } from '../src/nation.ts';
import type { Task } from '../src/types.ts';

const TODAY = '2026-10-08';

const base: Task = {
  id: 'x', userId: 'u', listId: null, parentId: null, noteId: null, title: 'x', notes: null, status: 'in_progress',
  dueOn: null, dueAt: null, remindAt: null, declaredAt: null, rrule: null, estimateMinutes: null, scheduledOn: null, sortOrder: 0,
  source: 'self', externalId: null, completedAt: null, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', deletedAt: null,
};
const task = (fields: Partial<Task>): Task => ({ ...base, title: fields.id ?? 'x', ...fields });

test('Today keeps the time; Pick a day and Let it go clear a deadline that passed', () => {
  const timed = task({ scheduledOn: '2026-10-07', remindAt: atLocalTime('2026-10-07', 15, 30), dueOn: '2026-10-03' });
  assert.deepEqual(todayPatch(timed, TODAY), { scheduledOn: TODAY, remindAt: atLocalTime(TODAY, 15, 30), declaredAt: null });

  assert.deepEqual(dayPatch(timed, TODAY, '2026-10-10', { hour: 9, minute: 0 }), {
    scheduledOn: '2026-10-10', remindAt: atLocalTime('2026-10-10', 9, 0), declaredAt: null, dueOn: null, dueAt: null,
  });
  assert.deepEqual(dayPatch(timed, TODAY, TODAY, null), { scheduledOn: TODAY, remindAt: null, declaredAt: null }, 'picking today keeps it, like Today');

  assert.deepEqual(letGoPatch(timed, TODAY), { scheduledOn: null, remindAt: null, declaredAt: null, dueOn: null, dueAt: null });
  const ahead = task({ scheduledOn: '2026-10-07', dueOn: '2026-10-20' });
  assert.deepEqual(letGoPatch(ahead, TODAY), { scheduledOn: null, remindAt: null, declaredAt: null }, 'a deadline ahead stays');
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
  assert.deepEqual(undoPatch(t, letGoPatch(t, TODAY)), { scheduledOn: '2026-10-07', remindAt: t.remindAt, declaredAt: null, dueOn: '2026-10-03', dueAt: null });
});

test('the recap says what yesterday held, in true numbers, and nothing at zero', () => {
  const { recap } = voice.briefing;
  assert.equal(recap(4, 2), 'Yesterday: four things finished and two starts.');
  assert.equal(recap(1, 0), 'Yesterday: one thing finished.');
  assert.equal(recap(0, 1), 'Yesterday: one start.');
  assert.equal(recap(12, 0), 'Yesterday: 12 things finished.');
  assert.equal(recap(0, 0), null);
});
