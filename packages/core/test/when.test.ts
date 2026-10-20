import assert from 'node:assert/strict';
import { test } from 'node:test';

import { atLocalTime, clockOf } from '../src/dates.ts';
import { duePatch, monthlyChoices, monthlyOf, pickerWeek, repeatChips, repeatPatch, daysChangeLanding, sameRepeat, weeklyInterval, weeklyOf, weeklyRule, whenPatch } from '../src/when.ts';

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
  assert.deepEqual(repeatChips('2026-10-06').map((c) => c.label), ['Every day', 'Every weekday', 'Every week on Tue']);
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
  // An old plain "every month" given its own day writes the day in and stays, even carried over.
  const rent = { ...skipped, scheduledOn: '2026-10-15', rrule: 'FREQ=MONTHLY' };
  assert.deepEqual(repeatPatch(rent, 'FREQ=MONTHLY;BYMONTHDAY=15', '2026-10-20'), { rrule: 'FREQ=MONTHLY;BYMONTHDAY=15' });
  const cactus = { ...skipped, scheduledOn: '2026-10-15', rrule: 'FREQ=MONTHLY;INTERVAL=2' };
  assert.deepEqual(repeatPatch(cactus, 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15', '2026-10-20'), { rrule: 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15' });
});

test('an every-other-month repeat keeps its months when its day changes', () => {
  const base = { remindAt: null, dueOn: null, dueAt: null, declaredAt: null, rrule: 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15' };
  // Turns in Oct, Dec, Feb: from 15 December, the 1st is 1 February and the last day 31 December.
  const dec = { ...base, scheduledOn: '2026-12-15' };
  assert.equal(repeatPatch(dec, 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=1', '2026-10-20').scheduledOn, '2027-02-01');
  assert.equal(repeatPatch(dec, 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=-1', '2026-10-20').scheduledOn, '2026-12-31');
  // Carried over from 15 October: the 1st is 1 December, the third Thursday 17 December.
  const oct = { ...base, scheduledOn: '2026-10-15' };
  assert.equal(repeatPatch(oct, 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=1', '2026-10-20').scheduledOn, '2026-12-01');
  assert.equal(repeatPatch(oct, 'FREQ=MONTHLY;INTERVAL=2;BYDAY=3TH', '2026-10-20').scheduledOn, '2026-12-17');
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
  assert.deepEqual(
    [repeatPatch(nextSat, 'FREQ=MONTHLY', thu).scheduledOn, repeatPatch(nextSat, 'FREQ=MONTHLY', thu).rrule],
    ['2026-10-17', 'FREQ=MONTHLY;BYMONTHDAY=17'],
    'a monthly repeat keeps its day, written into the rule',
  );
  assert.equal(repeatPatch({ ...oneOff, scheduledOn: '2026-10-07' }, 'FREQ=WEEKLY;BYDAY=TU', thu).scheduledOn, '2026-10-20', 'carried over: from today, not a past Tuesday');
});

test('"every month" retyped in the Start sheet is the same monthly repeat, so it keeps its day', () => {
  assert.equal(sameRepeat('FREQ=MONTHLY', 'FREQ=MONTHLY;BYMONTHDAY=1'), true);
  assert.equal(sameRepeat('FREQ=MONTHLY', 'FREQ=MONTHLY'), true);
  assert.equal(sameRepeat('FREQ=MONTHLY', 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=1'), false, 'a different interval is a change');
  assert.equal(sameRepeat('FREQ=MONTHLY;BYMONTHDAY=15', 'FREQ=MONTHLY;BYMONTHDAY=1'), false, 'a new day is a change');
  assert.equal(sameRepeat('FREQ=MONTHLY', null), false);
});

test('Every month… offers the task’s day, its weekday’s place, the 1st and the last day, with no two the same', () => {
  const parts = (anchor: string, interval?: number) => monthlyChoices(anchor, interval).map((c) => c.rrule.replace('FREQ=MONTHLY;', ''));
  assert.deepEqual(parts('2026-10-20'), ['BYMONTHDAY=20', 'BYDAY=3TU', 'BYMONTHDAY=1', 'BYMONTHDAY=-1']);
  assert.deepEqual(parts('2026-11-26'), ['BYMONTHDAY=26', 'BYDAY=4TH', 'BYDAY=-1TH', 'BYMONTHDAY=1', 'BYMONTHDAY=-1'], 'the fourth Thursday, and the last');
  assert.deepEqual(parts('2026-10-31'), ['BYDAY=-1SA', 'BYMONTHDAY=1', 'BYMONTHDAY=-1'], 'the 31st is the last day; no fifth Saturday');
  assert.deepEqual(parts('2026-11-01'), ['BYMONTHDAY=1', 'BYDAY=1SU', 'BYMONTHDAY=-1']);
  assert.deepEqual(parts('2026-10-15', 2)[0], 'INTERVAL=2;BYMONTHDAY=15', 'every other month keeps its months');
  // Picking one lands on its first turn from the task's day.
  const task = { scheduledOn: '2026-10-20', remindAt: null, dueOn: null, dueAt: null, rrule: null, declaredAt: null };
  assert.equal(repeatPatch(task, 'FREQ=MONTHLY;BYMONTHDAY=1', '2026-10-20').scheduledOn, '2026-11-01');
  assert.equal(repeatPatch(task, 'FREQ=MONTHLY;BYDAY=-1FR', '2026-10-20').scheduledOn, '2026-10-30');
  // An old plain "every month" reads as its current day; other repeats aren't monthly.
  assert.equal(monthlyOf('FREQ=MONTHLY', '2026-11-30'), 'FREQ=MONTHLY;BYMONTHDAY=30');
  assert.equal(monthlyOf('FREQ=MONTHLY;BYMONTHDAY=31', '2026-11-30'), 'FREQ=MONTHLY;BYMONTHDAY=31');
  assert.equal(monthlyOf('FREQ=WEEKLY;BYDAY=TU', '2026-10-20'), null);
});
