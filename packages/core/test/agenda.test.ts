import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildToday } from '../src/agenda.ts';
import type { Task } from '../src/types.ts';

const TODAY = '2026-10-03';
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString();

function task(id: string, fields: Partial<Task> = {}): Task {
  return {
    id, userId: 'u1', listId: null, parentId: null, title: id, notes: null, status: 'in_progress',
    dueOn: null, dueAt: null, remindAt: null, rrule: null, estimateMinutes: null, scheduledOn: null,
    sortOrder: 0, source: 'self', externalId: null, completedAt: null,
    createdAt: at(1, 9), updatedAt: at(1, 9), deletedAt: null, ...fields,
  };
}

const done = (day: number) => ({ status: 'completed' as const, completedAt: at(day, 9) });

test('Today: timed first, missed items roll forward, finished-today last', () => {
  const view = buildToday(
    [
      task('timed', { scheduledOn: TODAY, remindAt: at(3, 18) }),
      task('missed', { scheduledOn: '2026-10-02' }),
      task('tomorrow', { scheduledOn: '2026-10-04' }),
      task('undated'),
      task('finished-today', { scheduledOn: TODAY, ...done(3) }),
      task('finished-yesterday', { scheduledOn: '2026-10-02', ...done(2) }),
      task('due-today', { dueOn: TODAY }),
      task('deleted', { scheduledOn: TODAY, deletedAt: at(2, 9) }),
    ],
    TODAY,
  );
  assert.deepEqual(view.agenda.map((e) => e.task.id), ['timed', 'due-today', 'missed', 'finished-today']);
  assert.deepEqual(view.customs.map((t) => t.id), ['undated']);
  assert.equal(view.nextStep, null);
});

test('plan steps: the most urgent open step is the next small step', () => {
  const view = buildToday(
    [
      task('paper', { title: 'History paper', dueOn: '2026-10-09' }),
      task('s1', { parentId: 'paper', sortOrder: 1, scheduledOn: '2026-10-02', ...done(2) }),
      task('s2', { parentId: 'paper', sortOrder: 2, scheduledOn: TODAY }),
      task('s3', { parentId: 'paper', sortOrder: 3, scheduledOn: '2026-10-04' }),
    ],
    TODAY,
  );
  assert.equal(view.nextStep?.task.id, 's2');
  assert.deepEqual(
    [view.nextStep?.parentTitle, view.nextStep?.stepIndex, view.nextStep?.stepCount],
    ['History paper', 2, 3],
  );
  assert.deepEqual(view.agenda, [], 'the next step is not repeated in the agenda');
  assert.deepEqual(view.customs, [], 'a dated parent is not a Customs capture');
});
