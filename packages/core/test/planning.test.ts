import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildToday } from '../src/agenda.ts';
import { fallbackStepDates, parseMinutes, suggestsPlan } from '../src/planning.ts';
import type { Task } from '../src/types.ts';

test('estimates become minutes (same rules as the database backfill)', () => {
  assert.deepEqual(
    ['15 min', '45 mins', '1 hour', '1.5 hours', '2 hrs', '1h 30m', '10-15 min', '20', 'soon', '', null].map(parseMinutes),
    [15, 45, 60, 90, 120, 90, 15, 20, null, null, null],
  );
});

test('"Plan it" is offered for big or vague tasks only', () => {
  for (const title of ['Study for orgo midterm', 'Write 10-page history paper', 'Clean my room', 'Essay', 'Figure out what to do about summer housing']) {
    assert.equal(suggestsPlan(title), true, title);
  }
  for (const title of ['Walk Biscuit', 'Buy stamps', 'Call mom', 'Read ch. 4', 'Reply to Prof. Alvarez']) {
    assert.equal(suggestsPlan(title), false, title);
  }
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
