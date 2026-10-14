import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildToday } from '../src/agenda.ts';
import { buildTerritories, buildTerritory, effectiveListId, isInCustoms, matchTerritory } from '../src/territories.ts';
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

test('territory summaries: in order, open counts, the most pressing dated item; deleted ones left out', () => {
  const view = buildTerritories(
    LISTS,
    [
      task('lab', { listId: 'chem', scheduledOn: '2026-10-09' }),
      task('pset', { listId: 'chem', dueOn: '2026-10-12' }),
      task('email', { listId: 'chem' }),
      task('paper', { listId: 'chem', dueOn: '2026-10-16' }),
      task('p1', { parentId: 'paper', scheduledOn: '2026-10-07', sortOrder: 1 }),
      task('p2', { parentId: 'paper', scheduledOn: '2026-10-08', sortOrder: 2 }),
      task('walk', { listId: 'home', scheduledOn: '2026-10-04', remindAt: at(4, 18), rrule: 'FREQ=DAILY' }),
      task('bins', { listId: 'home', scheduledOn: TODAY, remindAt: at(6, 7) }),
      task('done-here', { listId: 'home', scheduledOn: TODAY, ...done }),
      task('in-a-note', { listId: 'home', noteId: 'n1', scheduledOn: TODAY, remindAt: at(6, 6) }),
    ],
    TODAY,
  );
  assert.deepEqual(view.territories.map((s) => s.list.id), ['chem', 'home']);
  assert.deepEqual(view.territories.map((s) => s.open), [4, 2], 'a plan counts once; finished tasks and checklist lines don’t count');
  assert.equal(view.territories[0].next?.task.id, 'p1', 'a plan’s step is its next item');
  assert.deepEqual(
    [view.territories[1].next?.task.id, view.territories[1].next?.date],
    ['bins', TODAY],
    'a missed 6 PM walk counts as today, after the 7 AM bins',
  );
});

test('a plan’s steps live where the plan lives', () => {
  const paper = task('paper', { listId: 'chem' });
  const byId = new Map([[paper.id, paper]]);
  assert.equal(effectiveListId(task('s1', { parentId: 'paper' }), byId), 'chem');
  assert.equal(effectiveListId(task('s2', { parentId: 'paper', listId: 'home' }), byId), 'chem');
  assert.equal(effectiveListId(task('t', { listId: 'home' }), byId), 'home');
});

test('a territory’s page: coming up by day and time, then anytime as arranged; plans show progress', () => {
  const view = buildTerritory(
    'chem',
    [
      task('pset', { listId: 'chem', dueOn: '2026-10-12', sortOrder: 1 }),
      task('lab', { listId: 'chem', scheduledOn: '2026-10-09', remindAt: at(9, 14), sortOrder: 2 }),
      task('missed', { listId: 'chem', scheduledOn: '2026-10-02', sortOrder: 3 }),
      task('email', { listId: 'chem', sortOrder: 20 }),
      task('read', { listId: 'chem', sortOrder: 10 }),
      task('paper', { listId: 'chem', sortOrder: 5 }),
      task('s1', { parentId: 'paper', scheduledOn: TODAY, sortOrder: 1, ...done }),
      task('s2', { parentId: 'paper', scheduledOn: '2026-10-07', sortOrder: 2 }),
      task('finished', { listId: 'chem', ...done }),
      task('elsewhere', { listId: 'home' }),
      task('checklist-line', { listId: 'chem', noteId: 'n1' }),
    ],
    TODAY,
  );
  assert.deepEqual(view.comingUp.map((e) => [e.task.id, e.date]), [
    ['missed', TODAY],
    ['lab', '2026-10-09'],
    ['pset', '2026-10-12'],
  ]);
  assert.deepEqual(view.anytime.map((e) => e.task.id), ['paper', 'read', 'email']);
  assert.deepEqual(view.anytime[0].steps, { done: 1, total: 2 });
  assert.deepEqual(buildTerritory(null, [task('stamps'), task('lab', { listId: 'chem' })], TODAY).anytime.map((e) => e.task.id), ['stamps'], 'null is Customs');
});

test('#tag matching: exact name first, then a prefix in the person’s order; accents and spaces ignored', () => {
  const lists = [list('a', 'Chem 201', 2), list('b', 'Chemistry Club', 1), list('c', 'Café Shifts', 3), list('d', 'Chem', 4)];
  assert.equal(matchTerritory('chem', lists)?.id, 'd', 'exact beats prefix');
  assert.equal(matchTerritory('chem2', lists)?.id, 'a');
  assert.equal(matchTerritory('chemi', lists)?.id, 'b');
  assert.equal(matchTerritory('CAFE', lists)?.id, 'c');
  assert.equal(matchTerritory('chem201', lists)?.id, 'a');
  assert.equal(matchTerritory('gym', lists), null);
  assert.equal(matchTerritory('!!', lists), null);
});
