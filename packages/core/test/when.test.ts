import assert from 'node:assert/strict';
import { test } from 'node:test';

import { atLocalTime, clockOf } from '../src/dates.ts';
import { duePatch, pickerWeek, repeatChips, repeatPatch, daysChangeLanding, weeklyInterval, weeklyOf, weeklyRule, whenPatch } from '../src/when.ts';

test('when and due patches', () => {
  assert.deepEqual(whenPatch(null, null), { scheduledOn: null, remindAt: null, rrule: null, declaredAt: null }, 'no day: no repeat either');
  const at6 = whenPatch('2026-10-09', { hour: 18, minute: 0 });
  assert.equal(at6.scheduledOn, '2026-10-09');
  assert.equal(at6.declaredAt, null, 'a new When withdraws a Declaration');
  assert.deepEqual(clockOf(at6.remindAt!), { hour: 18, minute: 0 });
  assert.deepEqual(duePatch('2026-10-09', null), { dueOn: '2026-10-09', dueAt: null });
  assert.deepEqual(duePatch(null, { hour: 9, minute: 0 }), { dueOn: null, dueAt: null });
});

test('a repeat moves the task to its first day in the series, keeping the time', () => {
  const saturday6pm = { scheduledOn: '2026-10-10', remindAt: atLocalTime('2026-10-10', 18, 0), dueOn: null, dueAt: null, rrule: null };
  const weekdays = repeatPatch(saturday6pm, 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-10-06');
  assert.equal(weekdays.scheduledOn, '2026-10-12');
  assert.deepEqual(clockOf(weekdays.remindAt!), { hour: 18, minute: 0 });
  const unscheduled = { ...saturday6pm, scheduledOn: null, remindAt: null };
  assert.equal(repeatPatch(unscheduled, 'FREQ=DAILY', '2026-10-06').scheduledOn, '2026-10-06', 'starts today');
  assert.deepEqual(repeatPatch(saturday6pm, null, '2026-10-06'), { rrule: null });
  assert.deepEqual(repeatChips('2026-10-06').map((c) => c.label), ['Every day', 'Every weekday', 'Every week on Tue', 'Every month']);
});

test('picking a weekly repeat’s days', () => {
  assert.deepEqual(weeklyOf('FREQ=WEEKLY;BYDAY=MO,WE,SA'), { days: [1, 3, 6], interval: 1 });
  assert.deepEqual(weeklyOf('FREQ=WEEKLY;INTERVAL=2;BYDAY=TU'), { days: [2], interval: 2 });
  assert.equal(weeklyOf('FREQ=DAILY'), null);
  assert.equal(weeklyOf('FREQ=WEEKLY'), null, 'every week on the task’s own day has no days to pick');
  assert.equal(weeklyRule([0, 4, 2]), 'FREQ=WEEKLY;BYDAY=TU,TH,SU', 'Monday first, Sunday last');
  assert.equal(weeklyRule([5, 4, 3, 2, 1]), repeatChips('2026-10-06')[1].rrule, 'Mon–Fri is Every weekday');
  assert.equal(weeklyRule([2], 2), 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU', 'an interval stays');
  assert.deepEqual(pickerWeek.map((d) => d.short), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.equal(weeklyInterval('FREQ=WEEKLY;INTERVAL=2'), 2, '"every 2 weeks" keeps its 2 when days are picked');
  assert.equal(weeklyInterval('FREQ=WEEKLY;BYDAY=MO'), 1);
  assert.equal(weeklyInterval('FREQ=DAILY'), null);
});

test('saving a repeat that hasn’t changed moves nothing', () => {
  const thu = '2026-10-15';
  const skipped = { scheduledOn: '2026-10-24', remindAt: null, dueOn: null, dueAt: null, rrule: 'FREQ=WEEKLY;BYDAY=SA' };
  assert.equal(repeatPatch(skipped, 'FREQ=WEEKLY;BYDAY=SA', thu).scheduledOn, '2026-10-24', 'a Saturday skipped by hand stays skipped');
  const otherTue = { ...skipped, scheduledOn: '2026-10-27', rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU' };
  assert.equal(repeatPatch(otherTue, otherTue.rrule, '2026-10-19').scheduledOn, '2026-10-27', 'every other Tuesday stays on its week');
  assert.equal(daysChangeLanding(otherTue, otherTue.rrule, '2026-10-19'), null);
});

test('changing a repeat’s days lands on the first new day from today', () => {
  const thu = '2026-10-15';
  const mws = 'FREQ=WEEKLY;BYDAY=MO,WE,SA';
  const nextSat = { scheduledOn: '2026-10-17', remindAt: atLocalTime('2026-10-17', 18, 0), dueOn: null, dueAt: null, rrule: mws };
  const moved = repeatPatch(nextSat, 'FREQ=WEEKLY;BYDAY=TU,TH,SU', thu);
  assert.equal(moved.scheduledOn, '2026-10-18', 'today’s turn is done: Sunday, not today');
  assert.deepEqual(clockOf(moved.remindAt!), { hour: 18, minute: 0 });
  assert.equal(repeatPatch({ ...nextSat, scheduledOn: thu }, 'FREQ=WEEKLY;BYDAY=TU,TH,SU', thu).scheduledOn, thu, 'due today: today counts');
  assert.equal(repeatPatch({ ...nextSat, scheduledOn: '2026-10-12' }, 'FREQ=WEEKLY;BYDAY=TU,TH,SU', thu).scheduledOn, thu, 'carried over: today counts');
  assert.equal(repeatPatch(nextSat, 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU', thu).scheduledOn, '2026-10-20', 'every other Tuesday starts this Tuesday');
  const oneOff = { ...nextSat, scheduledOn: '2026-11-20', rrule: null };
  assert.equal(repeatPatch(oneOff, 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', thu).scheduledOn, '2026-11-20', 'a new repeat starts on the task’s own day');
  assert.equal(repeatPatch(nextSat, 'FREQ=MONTHLY', thu).scheduledOn, '2026-10-17', 'a monthly repeat keeps its day');
  assert.equal(repeatPatch({ ...oneOff, scheduledOn: '2026-10-07' }, 'FREQ=WEEKLY;BYDAY=TU', thu).scheduledOn, '2026-10-20', 'carried over: from today, not a past Tuesday');
});
