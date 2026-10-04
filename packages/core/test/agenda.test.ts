import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildToday, stepContext } from '../src/agenda.ts';
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
  assert.deepEqual(view.agenda.map((e) => e.task.id), ['timed', 'missed', 'finished-today']);
  assert.deepEqual(view.customs.map((t) => t.id), ['undated']);
  assert.equal(view.nextStep, null);
  assert.equal(view.upNext?.task.id, 'due-today', 'with no plan step, the most pressing untimed task is up next');
});

test('up next: deadlines first, one-offs before repeats, never a timed item', () => {
  const pick = (tasks: Task[]) => buildToday(tasks, TODAY).upNext?.task.id ?? null;
  assert.equal(pick([task('walk', { scheduledOn: TODAY, remindAt: at(3, 18) })]), null, 'a timed item happens at its time');
  assert.equal(
    pick([task('stretch', { scheduledOn: '2026-10-01', rrule: 'FREQ=DAILY' }), task('dentist', { scheduledOn: TODAY })]),
    'dentist',
  );
  assert.equal(pick([task('missed', { scheduledOn: '2026-10-01' }), task('later', { scheduledOn: TODAY })]), 'missed');
  assert.equal(pick([task('new', { scheduledOn: '2026-10-01' }), task('due', { dueOn: '2026-10-03' })]), 'due');
  assert.equal(pick([task('done', { scheduledOn: TODAY, ...done(3) })]), null);
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
  assert.equal(view.upNext, null, 'a plan step outranks any fallback');
  assert.deepEqual(view.customs, [], 'a dated parent is not a Customs capture');
});

test('step context: position in the plan and the next open step', () => {
  const tasks = [
    task('paper', { title: 'History paper' }),
    task('s1', { parentId: 'paper', sortOrder: 1 }),
    task('s2', { parentId: 'paper', sortOrder: 2, ...done(2) }),
    task('s3', { parentId: 'paper', sortOrder: 3 }),
    task('s4', { parentId: 'paper', sortOrder: 4 }),
  ];
  const at = (id: string) => stepContext(tasks, tasks.find((t) => t.id === id)!);
  assert.equal(at('paper'), null, 'top-level tasks have no plan position');
  assert.deepEqual([at('s1')?.parent?.title, at('s1')?.index, at('s1')?.count, at('s1')?.next?.id], ['History paper', 1, 4, 's3']);
  assert.equal(at('s4')?.next?.id, 's1', 'wraps to an earlier open step');
  assert.equal(stepContext([task('only', { parentId: 'paper' })], task('only', { parentId: 'paper' }))?.next, null);
});
