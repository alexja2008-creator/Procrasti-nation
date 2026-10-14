import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildExport, exportFileName, noteAsText, type ExportInput } from '../src/export.ts';

const task = (id: string, extra: object = {}) =>
  ({
    id,
    userId: 'u',
    listId: null,
    parentId: null,
    noteId: null,
    title: `Task ${id}`,
    notes: null,
    status: null,
    dueOn: null,
    dueAt: null,
    remindAt: null,
    rrule: null,
    estimateMinutes: null,
    scheduledOn: null,
    sortOrder: 0,
    source: 'self',
    externalId: null,
    completedAt: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    deletedAt: null,
    ...extra,
  }) as never;

test("a note's checklist lines read as text, ticked or not", () => {
  const tasks = new Map([
    ['00000000-0000-4000-8000-00000000000a', { title: 'Read chapter 5', completedAt: '2026-10-02T00:00:00Z' }],
    ['00000000-0000-4000-8000-00000000000b', { title: 'Lab report', completedAt: null }],
  ]);
  const body = 'Chem\nBefore Friday:\n[[task:00000000-0000-4000-8000-00000000000a]]\n[[task:00000000-0000-4000-8000-00000000000b]]\n[[task:00000000-0000-4000-8000-0000000000ff]]\nThat’s it';
  assert.equal(noteAsText(body, tasks), 'Chem\nBefore Friday:\n[x] Read chapter 5\n[ ] Lab report\n[ ] (removed)\nThat’s it');
});

test('the export: everything kept, nothing deleted, answers in plain words', () => {
  const input: ExportInput = {
    exportedAt: '2026-10-07T20:00:00Z',
    account: { citizenNumber: 42, email: 'maya@example.com', phone: null, createdAt: '2026-09-01T00:00:00Z', username: 'maya' },
    settings: {
      userId: 'u',
      citizenNumber: 42,
      timezone: 'America/New_York',
      dayRolloverHour: 3,
      preferences: { persona: 'school', hours: 'night', style: 'overwhelmed', nudgeTone: 'roast', heardFrom: 'friend' },
      onboardingCompletedAt: '2026-09-01T00:05:00Z',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    lists: [
      { id: 'l2', userId: 'u', name: 'Work', kind: 'work', ink: 'violet', sortOrder: 2, createdAt: 'x', updatedAt: 'x', deletedAt: null },
      { id: 'l1', userId: 'u', name: 'Chem 201', kind: 'school', ink: 'forest', sortOrder: 1, createdAt: 'x', updatedAt: 'x', deletedAt: null },
      { id: 'l0', userId: 'u', name: 'Gone', kind: 'other', ink: 'forest', sortOrder: 0, createdAt: 'x', updatedAt: 'x', deletedAt: 'y' },
    ],
    tasks: [
      task('plan', { title: 'History essay', createdAt: '2026-10-01T00:00:00Z' }),
      task('step', { title: 'Gather sources', parentId: 'plan', createdAt: '2026-10-01T00:00:01Z', source: 'ai' }),
      task('deleted', { deletedAt: '2026-10-03T00:00:00Z' }),
      task('00000000-0000-4000-8000-0000000000c1', { title: 'Buy goggles', noteId: 'n1', completedAt: '2026-10-04T00:00:00Z', createdAt: '2026-10-02T00:00:00Z' }),
    ],
    notes: [
      { id: 'n1', userId: 'u', listId: 'l1', taskId: null, body: 'Lab\n[[task:00000000-0000-4000-8000-0000000000c1]]', createdAt: 'a', updatedAt: '2026-10-05', deletedAt: null },
      { id: 'n0', userId: 'u', listId: null, taskId: null, body: 'old', createdAt: 'a', updatedAt: '2026-10-01', deletedAt: '2026-10-02' },
    ],
    stamps: [{ kind: 'first-start', earnedAt: '2026-09-02T00:00:00Z', taskId: null, listId: null }],
    starts: [{ taskId: 'step', startedAt: '2026-10-02T00:00:00Z', endedAt: '2026-10-02T00:05:00Z', plannedMinutes: 5, outcome: 'done' }],
    plans: [{ taskId: 'plan', createdAt: '2026-10-01T00:00:00Z' }],
  };
  const out = buildExport(input);
  assert.equal(out.format, 'procrastination-export');
  assert.equal(out.version, 1);
  assert.deepEqual(out.settings?.application, { purposeOfVisit: 'school', hours: 'night', whatStopsYou: 'overwhelmed', nudgeTone: 'roast', heardFrom: 'friend' });
  assert.equal(out.settings?.dayEndsAtHour, 3);
  assert.deepEqual(out.territories.map((t) => t.name), ['Chem 201', 'Work'], 'in their order, deleted ones left out');
  assert.deepEqual(out.tasks.map((t) => t.id), ['plan', 'step', '00000000-0000-4000-8000-0000000000c1'], 'oldest first, deleted ones left out');
  assert.equal(out.tasks[1].planId, 'plan');
  assert.deepEqual(out.notes.map((n) => n.text), ['Lab\n[x] Buy goggles']);
  assert.equal(out.stamps.length, 1);
  assert.equal(out.startModeSessions[0].outcome, 'done');
  assert.equal(out.aiPlans.length, 1);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(out)));
});

test('the file is named for the day', () => {
  assert.equal(exportFileName('2026-10-07'), 'procrastination-2026-10-07.json');
});
