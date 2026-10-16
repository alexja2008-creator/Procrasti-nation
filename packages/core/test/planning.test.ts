import assert from 'node:assert/strict';
import { test } from 'node:test';

import { atLocalTime, clockOf } from '../src/dates.ts';
import { fallbackStepDates, followDays, followPatches, startPlanOn } from '../src/planning.ts';
import type { Task } from '../src/types.ts';

test('fallback step dates spread to the deadline', () => {
  assert.deepEqual(fallbackStepDates(3, '2026-10-03', '2026-10-09'), ['2026-10-03', '2026-10-06', '2026-10-09']);
  assert.deepEqual(fallbackStepDates(3, '2026-10-03', null), ['2026-10-03', '2026-10-04', '2026-10-05']);
  assert.deepEqual(fallbackStepDates(2, '2026-10-03', '2026-10-01'), ['2026-10-03', '2026-10-04'], 'a past deadline is ignored');
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

test('Plan it starts on the task’s When day when that’s later', () => {
  const resolved = ['2026-10-15', '2026-10-16', '2026-10-18'];
  assert.deepEqual(startPlanOn(resolved, '2026-10-19', '2026-10-30'), ['2026-10-19', '2026-10-20', '2026-10-22']);
  assert.deepEqual(startPlanOn(resolved, '2026-10-19', '2026-10-21'), ['2026-10-19', '2026-10-20', '2026-10-21'], 'not past the deadline');
  assert.deepEqual(startPlanOn(resolved, '2026-10-15', null), resolved, 'today: as planned');
  assert.deepEqual(startPlanOn(resolved, null, null), resolved, 'no When day');
});
