import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatShortDate, nextOccurrence, occurrenceOnOrAfter, relativeDayLabel } from '../src/dates.ts';

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

test('day labels', () => {
  const today = '2026-10-03';
  assert.deepEqual(
    ['2026-10-03', '2026-10-04', '2026-10-02', '2026-10-07', '2026-10-12'].map((d) => relativeDayLabel(d, today)),
    ['Today', 'Tomorrow', 'Yesterday', 'Wed', 'Mon 12 Oct'],
  );
  assert.equal(formatShortDate('2026-10-09'), 'Fri 9 Oct');
});
