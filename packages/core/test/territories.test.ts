import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildToday } from '../src/agenda.ts';
import { buildTerritories, isInCustoms } from '../src/territories.ts';
import type { List, Task } from '../src/types.ts';

const TODAY = '2026-10-06'; // a Tuesday
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString();

function task(id: string, fields: Partial<Task> = {}): Task {
  return {
    id, userId: 'u1', listId: null, parentId: null, noteId: null, title: id, notes: null, status: 'in_progress',
    dueOn: null, dueAt: null, remindAt: null, rrule: null, estimateMinutes: null, scheduledOn: null,
    sortOrder: 0, source: 'self', externalId: null, completedAt: null,
    createdAt: at(1, 9), updatedAt: at(1, 9), deletedAt: null, ...fields,
  };
}

function list(id: string, name: string, sortOrder: number, fields: Partial<List> = {}): List {
  return {
    id, userId: 'u1', name, kind: 'custom', ink: 'forest', sortOrder,
    createdAt: at(1, 9), updatedAt: at(1, 9), deletedAt: null, ...fields,
  };
}

const done = { status: 'completed' as const, completedAt: at(5, 9) };
const LISTS = [list('home', 'Home', 2), list('chem', 'Chem 201', 1, { kind: 'school', ink: 'terracotta' }), list('gone', 'Old', 3, { deletedAt: at(2, 9) })];

test('Customs: undated, unfiled, not a repeat, no plan; the same items Today shows', () => {
  const tasks = [
    task('stamps'),
    task('filed', { listId: 'chem' }),
    task('dated', { scheduledOn: '2026-10-08' }),
    task('repeat', { rrule: 'FREQ=DAILY' }),
    task('paper'),
    task('s1', { parentId: 'paper' }),
    task('finished', done),
    task('checklist-line', { noteId: 'n1' }),
  ];
  const customs = buildTerritories(LISTS, tasks, TODAY).customs.map((t) => t.id);
  assert.deepEqual(customs, ['stamps']);
  assert.deepEqual(buildToday(tasks, TODAY).customs.map((t) => t.id), customs);
  assert.equal(isInCustoms(task('x'), true), false, 'a task with a plan is sorted already');
});
