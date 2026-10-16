import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildToday, groupAgenda, planToFinish, startTarget } from '../src/agenda.ts';
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

const plan = (id: string, n: number, fields: Partial<Task> = {}, stepFields: (i: number) => Partial<Task> = () => ({ scheduledOn: TODAY })) => [
  task(id, fields),
  ...Array.from({ length: n }, (_, i) => task(`${id}${i + 1}`, { parentId: id, sortOrder: i + 1, source: 'ai', ...stepFields(i + 1) })),
];

test('Today groups each plan into one item: two plans of seven steps are two things', () => {
  const tasks = [...plan('a', 7, { dueOn: '2026-10-09' }), ...plan('b', 7), task('loose', { scheduledOn: TODAY })];
  const view = buildToday(tasks, TODAY);
  const { items, openCount } = groupAgenda(view, tasks);
  assert.deepEqual(
    items.map((i) => (i.kind === 'plan' ? `plan:${i.group.plan.id}:${i.group.steps.length}` : i.entry.task.id)),
    ['plan:a:7', 'loose', 'plan:b:7'],
    'in the agenda order, the next small step (a1) joined to its plan',
  );
  assert.equal(openCount, 3);
  const a = items[0].kind === 'plan' ? items[0].group : null;
  assert.deepEqual([a?.done, a?.total, a?.readyToFinish, a?.steps[0].stepIndex], [0, 7, false, 1]);
});

test('Start on a plan starts its next open step; a plan finishes only when asked', () => {
  const tasks = [...plan('p', 3, {}, (i) => (i === 1 ? done(2) : {})), task('solo')];
  assert.equal(startTarget(tasks, 'p'), 'p2', 'the first open step, in step order');
  assert.equal(startTarget(tasks, 'p3'), 'p3');
  assert.equal(startTarget(tasks, 'solo'), 'solo');
  assert.equal(planToFinish(tasks, tasks.find((t) => t.id === 'p2')!), null, 'p3 is still open');
  const lastOpen = tasks.map((t) => (t.id === 'p2' ? { ...t, ...done(3) } : t));
  assert.equal(planToFinish(lastOpen, lastOpen.find((t) => t.id === 'p3')!)?.id, 'p', 'checking off the last open step');
  assert.equal(planToFinish(lastOpen, { id: 'solo', parentId: null }), null);
});
