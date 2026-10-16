import assert from 'node:assert/strict';
import { test } from 'node:test';

import { atLocalTime, clockOf } from '../src/dates.ts';
import { dayChips, duePatch, monthGrid, pickerHours, pickerWeek, pickHour, quarterLabel, quartersOf, repeatChips, repeatPatch, daysChangeLanding, weeklyInterval, weeklyOf, weeklyRule, shiftMonth, shiftWeek, timeSlots, weekStrip, whenPatch } from '../src/when.ts';

const chipDates = (today: string) => Object.fromEntries(dayChips(today).map((c) => [c.id, c.date]));

test('day chips are today and tomorrow; other days come from the calendar', () => {
  assert.deepEqual(chipDates('2026-10-06'), { today: '2026-10-06', tomorrow: '2026-10-07' });
  assert.deepEqual(chipDates('2026-10-31'), { today: '2026-10-31', tomorrow: '2026-11-01' }, 'across a month');
  assert.deepEqual(chipDates('2026-12-31'), { today: '2026-12-31', tomorrow: '2027-01-01' }, 'and a year');
});

test('the time grid: hours 6 AM to 11 PM, then quarters', () => {
  assert.deepEqual([pickerHours()[0], pickerHours().at(-1), pickerHours().length], [6, 23, 18]);
  assert.deepEqual(quartersOf(20).map((t) => t.minute), [0, 15, 30, 45]);
  assert.deepEqual(quartersOf(20).map((t) => quarterLabel(t.minute)), [':00', ':15', ':30', ':45']);
  const at820 = { hour: 20, minute: 20 };
  assert.deepEqual(quartersOf(20, at820).map((t) => t.minute), [30, 45], 'only times after 8:20');
  assert.deepEqual(quartersOf(20, { hour: 20, minute: 30 }).map((t) => t.minute), [45], 'not the minute itself');
  assert.equal(pickerHours({ hour: 23, minute: 45 }).length, 0, 'nothing left today');
  assert.equal(pickerHours(at820)[0], 20, 'the hour it is still counts while a quarter is left');
});

test('picking an hour keeps the minutes when it can', () => {
  assert.deepEqual(pickHour(19, { hour: 18, minute: 15 }), { hour: 19, minute: 15 });
  assert.deepEqual(pickHour(19, null), { hour: 19, minute: 0 });
  assert.deepEqual(pickHour(20, { hour: 21, minute: 15 }, { hour: 20, minute: 20 }), { hour: 20, minute: 30 }, '8:15 is gone, so 8:30');
  assert.equal(pickHour(20, null, { hour: 20, minute: 50 }), null, 'an hour with nothing left');
});

test('month grid starts on Monday and pads the edges', () => {
  const october = monthGrid(2026, 9); // 1 Oct 2026 is a Thursday
  assert.deepEqual(october[0], [null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.deepEqual(october.at(-1), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
  assert.equal(monthGrid(2027, 1).flat().filter(Boolean).length, 28, 'February 2027');
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
});

test('time slots run every half hour', () => {
  const slots = timeSlots();
  assert.deepEqual([slots[0], slots[1], slots.at(-1)], [{ hour: 6, minute: 0 }, { hour: 6, minute: 30 }, { hour: 23, minute: 30 }]);
});

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

test('changing an every-other-week repeat’s days keeps its weeks', () => {
  const otherTue = { scheduledOn: '2026-10-27', remindAt: null, dueOn: null, dueAt: null, rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU' };
  // Monday 19 October: the week of the 19th is an off week, the 26th an on week.
  assert.equal(repeatPatch(otherTue, 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH', '2026-10-19').scheduledOn, '2026-10-27');
  assert.equal(repeatPatch(otherTue, 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO', '2026-10-19').scheduledOn, '2026-10-26');
});

test('picking a day for “every 2 weeks” keeps its weeks', () => {
  const plain = { scheduledOn: '2026-10-30', remindAt: null, dueOn: null, dueAt: null, rrule: 'FREQ=WEEKLY;INTERVAL=2' };
  assert.equal(repeatPatch(plain, 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TH', '2026-10-19').scheduledOn, '2026-10-29', 'Thursday of the week it was due, not the week after');
});

test('a new every-other-week repeat starts on its first matching day', () => {
  const undated = { scheduledOn: null, remindAt: null, dueOn: null, dueAt: null, rrule: null };
  assert.equal(repeatPatch(undated, 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU', '2026-10-15').scheduledOn, '2026-10-20', 'this Tuesday, not the one after');
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

test('week strip: Monday first, containing the day', () => {
  const week = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
  assert.deepEqual(weekStrip('2026-10-07'), week, 'Wednesday');
  assert.deepEqual(weekStrip('2026-10-05'), week, 'Monday');
  assert.deepEqual(weekStrip('2026-10-11'), week, 'Sunday belongs to the week before');
  assert.deepEqual(weekStrip('2026-12-30').at(-1), '2027-01-03', 'across the new year');
  assert.equal(shiftWeek('2026-10-07', 1), '2026-10-14');
  assert.equal(shiftWeek('2026-10-07', -2), '2026-09-23');
});
