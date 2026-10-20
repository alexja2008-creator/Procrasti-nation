import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatShortDate, nextOccurrence, occurrenceOnOrAfter, relativeDayLabel, relativeDayPhrase } from '../src/dates.ts';

test('weekly repeats on chosen days', () => {
  assert.equal(occurrenceOnOrAfter('FREQ=WEEKLY;BYDAY=MO,WE', '2026-10-03', '2026-10-03'), '2026-10-05');
  assert.equal(nextOccurrence('FREQ=WEEKLY;BYDAY=MO,WE', '2026-10-05', '2026-10-05'), '2026-10-07');
  assert.equal(nextOccurrence('FREQ=WEEKLY;BYDAY=MO,WE', '2026-10-05', '2026-10-07'), '2026-10-12');
});

test('intervals count from the first occurrence', () => {
  assert.equal(nextOccurrence('FREQ=WEEKLY;INTERVAL=2', '2026-10-03', '2026-10-03'), '2026-10-17');
  assert.equal(nextOccurrence('FREQ=WEEKLY;INTERVAL=2;BYDAY=TU', '2026-10-06', '2026-10-06'), '2026-10-20');
});

test('missed occurrences are skipped, like Reminders', () => {
  assert.equal(nextOccurrence('FREQ=DAILY', '2026-09-01', '2026-10-03'), '2026-10-04');
  assert.equal(nextOccurrence('FREQ=DAILY;INTERVAL=3', '2026-09-01', '2026-10-03'), '2026-10-04');
});

test('monthly repeats clamp to short months without drifting', () => {
  assert.equal(nextOccurrence('FREQ=MONTHLY', '2026-01-31', '2026-01-31'), '2026-02-28');
  assert.equal(nextOccurrence('FREQ=MONTHLY', '2026-01-31', '2026-02-28'), '2026-03-31');
  assert.equal(nextOccurrence('FREQ=YEARLY', '2024-02-29', '2024-02-29'), '2025-02-28');
});

test('monthly repeats on a day of the month, the last day, or the nth weekday', () => {
  const next = (rrule: string, anchor: string, after: string) => nextOccurrence(rrule, anchor, after);
  const chain = (rrule: string, anchor: string, n: number) => {
    const days = [anchor];
    for (let i = 1; i < n; i++) days.push(next(rrule, days[i - 1], days[i - 1]));
    return days;
  };
  // The 31st lands on each month's last day and comes back to the 31st: checking off re-anchors, and nothing slides.
  assert.deepEqual(chain('FREQ=MONTHLY;BYMONTHDAY=31', '2026-10-31', 6), ['2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31']);
  assert.deepEqual(chain('FREQ=MONTHLY;BYMONTHDAY=-1', '2028-01-31', 3), ['2028-01-31', '2028-02-29', '2028-03-31'], 'the last day, leap year included');
  assert.deepEqual(chain('FREQ=MONTHLY;BYMONTHDAY=1,15', '2026-10-15', 4), ['2026-10-15', '2026-11-01', '2026-11-15', '2026-12-01']);
  assert.deepEqual(chain('FREQ=MONTHLY;BYDAY=3TU', '2026-10-20', 3), ['2026-10-20', '2026-11-17', '2026-12-15']);
  assert.deepEqual(chain('FREQ=MONTHLY;BYDAY=-1FR', '2026-10-30', 3), ['2026-10-30', '2026-11-27', '2026-12-25']);
  assert.deepEqual(chain('FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15', '2026-10-15', 3), ['2026-10-15', '2026-12-15', '2027-02-15']);
  // From a day that isn't a turn (a new repeat, or a carried-over one): the first turn on or after it.
  assert.equal(occurrenceOnOrAfter('FREQ=MONTHLY;BYMONTHDAY=1', '2026-10-20', '2026-10-20'), '2026-11-01');
  assert.equal(occurrenceOnOrAfter('FREQ=MONTHLY;BYDAY=1MO', '2026-10-15', '2026-10-15'), '2026-11-02');
});

test('day labels', () => {
  const today = '2026-10-03';
  assert.deepEqual(
    ['2026-10-03', '2026-10-04', '2026-10-02', '2026-10-07', '2026-10-12'].map((d) => relativeDayLabel(d, today)),
    ['Today', 'Tomorrow', 'Yesterday', 'Wed', 'Mon 12 Oct'],
  );
  assert.equal(formatShortDate('2026-10-09'), 'Fri 9 Oct');
});

test('mid-sentence day phrases', () => {
  assert.deepEqual(
    ['2026-10-03', '2026-10-04', '2026-10-07'].map((d) => relativeDayPhrase(d, '2026-10-03')),
    ['today', 'tomorrow', 'Wed'],
  );
});
