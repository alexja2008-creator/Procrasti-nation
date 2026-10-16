import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildToday } from '../src/agenda.ts';
import { atLocalTime, clockOf } from '../src/dates.ts';
import { fallbackStepDates, followDays, followPatches, parseMinutes, sortOrderForMove, startPlanOn } from '../src/planning.ts';
import type { Task } from '../src/types.ts';

test('estimates become minutes (same rules as the database backfill)', () => {
  assert.deepEqual(
    ['15 min', '45 mins', '1 hour', '1.5 hours', '2 hrs', '1h 30m', '10-15 min', '20', 'soon', '', null].map(parseMinutes),
    [15, 45, 60, 90, 120, 90, 15, 20, null, null, null],
  );
});

test('fallback step dates spread to the deadline', () => {
  assert.deepEqual(fallbackStepDates(3, '2026-10-03', '2026-10-09'), ['2026-10-03', '2026-10-06', '2026-10-09']);
  assert.deepEqual(fallbackStepDates(3, '2026-10-03', null), ['2026-10-03', '2026-10-04', '2026-10-05']);
  assert.deepEqual(fallbackStepDates(2, '2026-10-03', '2026-10-01'), ['2026-10-03', '2026-10-04'], 'a past deadline is ignored');
});

test('a planned task leaves Customs even without a date', () => {
  const base = { userId: 'u', listId: null, notes: null, status: 'in_progress' as const, dueOn: null, dueAt: null, remindAt: null,
    rrule: null, estimateMinutes: null, sortOrder: 0, source: 'self' as const, externalId: null, completedAt: null,
    createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', deletedAt: null };
  const tasks: Task[] = [
    { ...base, id: 'big', parentId: null, title: 'Clean my room', scheduledOn: null },
    { ...base, id: 'step', parentId: 'big', title: 'Clear the desk', scheduledOn: '2026-10-05', source: 'ai' },
    { ...base, id: 'loose', parentId: null, title: 'Buy stamps', scheduledOn: null },
  ];
  assert.deepEqual(buildToday(tasks, '2026-10-03').customs.map((t) => t.id), ['loose']);
});

test('moving a step writes one sort order, halfway between its new neighbours', () => {
  const orders = [1, 2, 3, 4];
  const reorder = (from: number, to: number) => {
    const moved = orders.map((o, i) => (i === from ? sortOrderForMove(orders, from, to) : o));
    return moved.map((o, i) => ({ o, i })).sort((a, b) => a.o - b.o).map((x) => x.i);
  };
  assert.deepEqual(reorder(0, 2), [1, 2, 0, 3], 'down');
  assert.deepEqual(reorder(3, 0), [3, 0, 1, 2], 'to the top');
  assert.deepEqual(reorder(1, 3), [0, 2, 3, 1], 'to the bottom');
  assert.equal(sortOrderForMove([5], 0, 0), 5, 'alone, nothing moves');
});

function inZone<T>(tz: string, fn: () => T): T {
  const before = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
}

// Thursday 15 October 2026: a plan's steps on Thu, Sat and Sun, the first moved to Monday (family testing).
const stepBase = { userId: 'u', listId: null, notes: null, status: 'in_progress' as const, dueOn: null, dueAt: null, remindAt: null,
  rrule: null, estimateMinutes: null, source: 'ai' as const, externalId: null, completedAt: null, declaredAt: null, noteId: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', deletedAt: null };
const step = (id: string, sortOrder: number, scheduledOn: string | null, extra: Partial<Task> = {}): Task =>
  ({ ...stepBase, id, parentId: 'plan', title: id, sortOrder, scheduledOn, ...extra }) as Task;
const THU = '2026-10-15';
const steps = [step('one', 1, '2026-10-15'), step('two', 2, '2026-10-17'), step('three', 3, '2026-10-18')];
const days = (changes: ReturnType<typeof followPatches>) => changes.map(({ task, patch }) => [task.id, patch.scheduledOn]);

test('moving a step later moves the steps after it by as many days', () => {
  const changes = followPatches(steps, steps[0], '2026-10-19', '2026-10-30', THU);
  assert.deepEqual(days(changes), [['two', '2026-10-21'], ['three', '2026-10-22']], 'Monday: Saturday and Sunday become Wednesday and Thursday');
  assert.deepEqual(days(followPatches(steps, steps[0], '2026-10-19', null, THU)), [['two', '2026-10-21'], ['three', '2026-10-22']], 'no deadline');
  assert.deepEqual(days(followPatches(steps, steps[1], '2026-10-20', null, THU)), [['three', '2026-10-21']], 'only the steps after it');
});

test('the steps that follow never pass the deadline', () => {
  assert.deepEqual(days(followPatches(steps, steps[0], '2026-10-19', '2026-10-20', THU)), [['two', '2026-10-20'], ['three', '2026-10-20']], 'squeezed in before it');
  assert.deepEqual(followDays(['2026-10-16', '2026-10-17', '2026-10-18'], '2026-10-15', '2026-10-19', '2026-10-25'), ['2026-10-20', '2026-10-21', '2026-10-22']);
  assert.deepEqual(followDays(['2026-10-16', '2026-10-20', '2026-10-24'], '2026-10-15', '2026-10-19', '2026-10-25'), ['2026-10-21', '2026-10-23', '2026-10-25'], 'spread out up to it');
  assert.deepEqual(followDays(['2026-10-17', '2026-10-18'], '2026-10-15', '2026-10-20', '2026-10-20'), ['2026-10-20', '2026-10-20'], 'moved onto the deadline: they share it');
  assert.deepEqual(followDays(['2026-10-17', '2026-10-18'], '2026-10-15', '2026-10-22', '2026-10-20'), ['2026-10-23', '2026-10-24'], 'already past it: one a day after');
});

test('a plan already out of order comes back into order', () => {
  // Step 1 was moved to Monday before this ask existed; Saturday and Sunday still come before it.
  const muddled = [step('one', 1, '2026-10-19'), step('two', 2, '2026-10-17'), step('three', 3, '2026-10-18')];
  assert.deepEqual(days(followPatches(muddled, muddled[0], '2026-10-20', null, THU)), [['two', '2026-10-20'], ['three', '2026-10-20']]);
  assert.deepEqual(followDays(['2026-10-17', '2026-10-18'], '2026-10-19', '2026-10-20', '2026-10-20'), ['2026-10-20', '2026-10-20'], 'with the deadline that day');
  assert.deepEqual(followDays(['2026-10-17', '2026-10-25'], '2026-10-19', '2026-10-21', null), ['2026-10-21', '2026-10-27'], 'one out of order, one not');
});

test('squeezing before the deadline never pulls a step earlier', () => {
  assert.deepEqual(followDays(['2026-10-29', '2026-10-30', '2026-10-31'], '2026-10-15', '2026-10-16', '2026-10-31'), ['2026-10-29', '2026-10-30', '2026-10-31']);
  assert.deepEqual(followDays(['2026-10-20', '2026-10-30'], '2026-10-15', '2026-10-25', '2026-10-31'), ['2026-10-28', '2026-10-31'], 'the late one stays, the early one spreads');
});

test('a step that follows keeps its time across the end of daylight saving', () => {
  inZone('America/New_York', () => {
    // Clocks go back on Sunday 1 November 2026.
    const before = [step('one', 1, '2026-10-29'), step('two', 2, '2026-10-30', { remindAt: atLocalTime('2026-10-30', 18, 30) })];
    const [{ patch }] = followPatches(before, before[0], '2026-11-02', null, '2026-10-29');
    assert.equal(patch.scheduledOn, '2026-11-03');
    assert.deepEqual(clockOf(patch.remindAt!), { hour: 18, minute: 30 });
  });
});

test('nothing follows a move earlier, a first day, or a step already done or declared', () => {
  assert.deepEqual(followPatches(steps, steps[1], '2026-10-16', null, THU), [], 'earlier');
  assert.deepEqual(followPatches(steps, steps[1], '2026-10-17', null, THU), [], 'the same day');
  assert.deepEqual(followPatches(steps, { ...steps[0], scheduledOn: null }, '2026-10-19', null, THU), [], 'it had no day before');
  assert.deepEqual(followPatches(steps, { ...steps[0], parentId: null }, '2026-10-19', null, THU), [], 'not a step');
  const signed = step('two', 2, '2026-10-17', { declaredAt: '2026-10-14T20:00:00Z', remindAt: atLocalTime('2026-10-17', 9, 0) });
  const done = step('three', 3, '2026-10-18', { completedAt: '2026-10-14T20:00:00Z' });
  const undated = step('four', 4, null);
  assert.deepEqual(followPatches([steps[0], signed, done, undated], steps[0], '2026-10-19', null, THU), []);
});

test('a step that follows keeps its time', () => {
  const timed = [steps[0], step('two', 2, '2026-10-17', { remindAt: atLocalTime('2026-10-17', 18, 30) })];
  const [{ patch }] = followPatches(timed, timed[0], '2026-10-19', null, THU);
  assert.equal(patch.scheduledOn, '2026-10-21');
  assert.deepEqual(clockOf(patch.remindAt!), { hour: 18, minute: 30 });
});

test('Plan it starts on the task’s When day when that’s later', () => {
  const resolved = ['2026-10-15', '2026-10-16', '2026-10-18'];
  assert.deepEqual(startPlanOn(resolved, '2026-10-19', '2026-10-30'), ['2026-10-19', '2026-10-20', '2026-10-22']);
  assert.deepEqual(startPlanOn(resolved, '2026-10-19', '2026-10-21'), ['2026-10-19', '2026-10-20', '2026-10-21'], 'not past the deadline');
  assert.deepEqual(startPlanOn(resolved, '2026-10-15', null), resolved, 'today: as planned');
  assert.deepEqual(startPlanOn(resolved, null, null), resolved, 'no When day');
});
