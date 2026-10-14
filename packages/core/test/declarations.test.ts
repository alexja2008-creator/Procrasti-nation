import assert from 'node:assert/strict';
import test from 'node:test';

import { atLocalTime } from '../src/dates.ts';
import { canDeclare, declarePatch, declaredWhen, isAhead, isDeclared, keepsDeclaration, startSoon } from '../src/declarations.ts';
import { planReminders } from '../src/reminders.ts';
import type { Task } from '../src/types.ts';
import { whenPatch } from '../src/when.ts';

const TODAY = '2026-10-12'; // a Monday

const base: Task = {
  id: 'essay', userId: 'u', listId: null, parentId: null, noteId: null, title: 'History essay', notes: null, status: 'in_progress',
  dueOn: null, dueAt: null, remindAt: null, declaredAt: null, rrule: null, estimateMinutes: null, scheduledOn: null, sortOrder: 0,
  source: 'self', externalId: null, completedAt: null, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', deletedAt: null,
};

test('signing makes the day and time the task’s When; any other When withdraws it', () => {
  const signedAt = new Date(2026, 9, 12, 9, 0);
  const patch = declarePatch(TODAY, { hour: 16, minute: 0 }, signedAt);
  assert.deepEqual(patch, { scheduledOn: TODAY, remindAt: atLocalTime(TODAY, 16, 0), declaredAt: signedAt.toISOString() });
  const declared = { ...base, ...patch };
  assert.equal(isDeclared(declared, TODAY), true);
  assert.equal(isDeclared({ ...declared, ...whenPatch('2026-10-13', { hour: 16, minute: 0 }) }, TODAY), false, 'moved: withdrawn');
  assert.equal(isDeclared(declared, '2026-10-13'), false, 'its day passed: it just carries over');
  assert.equal(isDeclared({ ...declared, completedAt: '2026-10-12T21:00:00Z' }, TODAY), false, 'done');
});

test('repeats and finished tasks can’t be declared', () => {
  assert.equal(canDeclare(base), true);
  assert.equal(canDeclare({ ...base, rrule: 'FREQ=DAILY' }), false);
  assert.equal(canDeclare({ ...base, completedAt: '2026-10-12T10:00:00Z' }), false);
});

test('starting from 15 minutes before to an hour after keeps it', () => {
  const declared = { ...base, ...declarePatch(TODAY, { hour: 16, minute: 0 }, new Date(2026, 9, 12, 9)) };
  const at = (h: number, m: number) => new Date(2026, 9, 12, h, m);
  assert.equal(keepsDeclaration(declared, at(15, 44)), false);
  assert.equal(keepsDeclaration(declared, at(15, 45)), true);
  assert.equal(keepsDeclaration(declared, at(16, 30)), true, 'late still counts');
  assert.equal(keepsDeclaration(declared, at(17, 0)), true);
  assert.equal(keepsDeclaration(declared, at(17, 1)), false);
  assert.equal(keepsDeclaration({ ...declared, declaredAt: null }, at(16, 0)), false, 'not declared');
});

test('the statement’s words and the In 15 min chip', () => {
  assert.equal(declaredWhen(TODAY, { hour: 16, minute: 0 }, TODAY), 'at 4:00 PM today');
  assert.equal(declaredWhen('2026-10-13', { hour: 9, minute: 30 }, TODAY), 'at 9:30 AM tomorrow');
  assert.equal(declaredWhen('2026-10-16', { hour: 15, minute: 0 }, TODAY), 'at 3:00 PM on Fri');
  assert.deepEqual(startSoon(new Date(2026, 9, 12, 14, 3)), { day: TODAY, time: { hour: 14, minute: 20 } });
  assert.deepEqual(startSoon(new Date(2026, 9, 12, 23, 50)), { day: '2026-10-13', time: { hour: 0, minute: 5 } }, 'past midnight');
  assert.equal(isAhead(TODAY, { hour: 14, minute: 0 }, new Date(2026, 9, 12, 14, 30)), false);
  assert.equal(isAhead(TODAY, { hour: 15, minute: 0 }, new Date(2026, 9, 12, 14, 30)), true);
});

test('a declared start’s reminder speaks as one, in their tone', () => {
  const declared = { ...base, ...declarePatch(TODAY, { hour: 16, minute: 0 }, new Date(2026, 9, 12, 9)) };
  const ring = (tone?: 'diplomat' | 'drill' | 'roast') => planReminders([declared], new Date(2026, 9, 12, 9, 5), { tone })[0];
  assert.equal(ring().title, 'History essay');
  assert.equal(ring().body, 'Your declared start. Five minutes is enough to begin.');
  assert.equal(ring('roast').body, 'You signed for this. In ink, basically.');
  assert.equal(ring().id, planReminders([{ ...declared, declaredAt: null }], new Date(2026, 9, 12, 9, 5))[0].id, 'same reminder, other words');
  assert.equal(planReminders([{ ...declared, declaredAt: null }], new Date(2026, 9, 12, 9, 5))[0].body, '', 'undeclared: as before');
});
