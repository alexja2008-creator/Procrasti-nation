import assert from 'node:assert/strict';
import { test } from 'node:test';

import { atLocalTime, clockOf } from '../src/dates.ts';
import { dayChips, duePatch, monthGrid, repeatChips, repeatPatch, shiftMonth, timeSlots, whenPatch } from '../src/when.ts';

const chipDates = (today: string) => Object.fromEntries(dayChips(today).map((c) => [c.id, c.date]));

test('day chips: weekend and next week from any weekday', () => {
  assert.deepEqual(chipDates('2026-10-06'), { today: '2026-10-06', tomorrow: '2026-10-07', weekend: '2026-10-10', 'next-week': '2026-10-12' }, 'Tuesday');
  assert.equal(chipDates('2026-10-10').weekend, '2026-10-10', 'Saturday: this weekend is today');
  assert.equal(chipDates('2026-10-11').weekend, '2026-10-11', 'Sunday too');
  assert.equal(chipDates('2026-10-11')['next-week'], '2026-10-12', 'Sunday: next week starts tomorrow');
  assert.equal(chipDates('2026-10-12')['next-week'], '2026-10-19', 'Monday: next week is a week away');
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
  assert.deepEqual(whenPatch(null, null), { scheduledOn: null, remindAt: null, rrule: null }, 'no day: no repeat either');
  const at6 = whenPatch('2026-10-09', { hour: 18, minute: 0 });
  assert.equal(at6.scheduledOn, '2026-10-09');
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
