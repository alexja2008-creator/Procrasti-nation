import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildNotes,
  byRecency,
  checklistIds,
  checklistToken,
  checklistToLine,
  insertChecklistLine,
  joinTitle,
  lineAt,
  lineToChecklist,
  noteHasContent,
  parseNoteBody,
  removeChecklistLine,
  serializeNoteBody,
  splitTitle,
  withinPages,
  type NoteBlock,
} from '../src/notes.ts';
import type { Note, Task } from '../src/types.ts';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';

function task(id: string, fields: Partial<Task> = {}): Task {
  return {
    id, userId: 'u1', listId: null, parentId: null, noteId: 'n1', title: id, notes: null, status: 'in_progress',
    dueOn: null, dueAt: null, remindAt: null, rrule: null, estimateMinutes: null, scheduledOn: null,
    sortOrder: 0, source: 'self', externalId: null, completedAt: null,
    createdAt: '2026-10-01T09:00:00Z', updatedAt: '2026-10-01T09:00:00Z', deletedAt: null, ...fields,
  };
}

function note(id: string, body: string, fields: Partial<Note> = {}): Note {
  return { id, userId: 'u1', listId: null, taskId: null, body, createdAt: '2026-10-01T09:00:00Z', updatedAt: '2026-10-01T09:00:00Z', deletedAt: null, ...fields };
}

const body = ['Lecture 7', 'Mitochondria make ATP.', checklistToken(A), checklistToken(B), '', 'Office hours Wed'].join('\n');

test('a body is runs of text and checklist lines, and writes back unchanged', () => {
  const blocks = parseNoteBody(body);
  assert.deepEqual(blocks, [
    { kind: 'text', text: 'Lecture 7\nMitochondria make ATP.' },
    { kind: 'task', taskId: A },
    { kind: 'task', taskId: B },
    { kind: 'text', text: '\nOffice hours Wed' },
  ]);
  assert.equal(serializeNoteBody(blocks), body);
  assert.deepEqual(parseNoteBody(''), [{ kind: 'text', text: '' }]);
  assert.deepEqual(checklistIds(body), [A, B]);
  assert.deepEqual(parseNoteBody('[[task:not-an-id]]'), [{ kind: 'text', text: '[[task:not-an-id]]' }], 'only real ids are checklist lines');
});

test('turning a line into a checklist line and back', () => {
  const start: NoteBlock[] = [{ kind: 'text', text: 'Packing\nSunscreen\nHat' }];
  const { blocks, text } = lineToChecklist(start, 0, 1, A);
  assert.equal(text, 'Sunscreen');
  assert.deepEqual(blocks, [{ kind: 'text', text: 'Packing' }, { kind: 'task', taskId: A }, { kind: 'text', text: 'Hat' }]);
  assert.deepEqual(lineToChecklist(start, 0, 0, A).blocks, [{ kind: 'task', taskId: A }, { kind: 'text', text: 'Sunscreen\nHat' }], 'the first line');
  assert.deepEqual(lineToChecklist(start, 0, 9, A).text, 'Hat', 'past the end means the last line');
  assert.deepEqual(checklistToLine(blocks, 1, 'Sunscreen'), start, 'back to text joins the lines around it');
  assert.deepEqual(removeChecklistLine(blocks, 1), [{ kind: 'text', text: 'Packing\nHat' }]);
  assert.deepEqual(insertChecklistLine(blocks, 1, B).map((b) => (b.kind === 'task' ? b.taskId : b.text)), ['Packing', A, B, 'Hat']);
  assert.deepEqual(checklistToLine(start, 0, 'x'), start, 'only checklist lines go back to text');
});

test('the cursor’s line', () => {
  assert.equal(lineAt('one\ntwo\nthree', 0), 0);
  assert.equal(lineAt('one\ntwo\nthree', 4), 1);
  assert.equal(lineAt('one\ntwo\nthree', 13), 2);
  assert.equal(lineAt('', 0), 0);
});

test('notes list newest first, titled by their first line, with checklist progress', () => {
  const tasks = [task(A, { title: 'Read ch 5', completedAt: '2026-10-02T09:00:00Z' }), task(B, { title: 'Lab report' }), task(C, { deletedAt: '2026-10-02T09:00:00Z' })];
  const notes = [
    note('old', 'Groceries\nMilk', { updatedAt: '2026-10-01T10:00:00Z', listId: 'home' }),
    note('lecture', `${body}\n${checklistToken(C)}`, { updatedAt: '2026-10-03T10:00:00Z', listId: 'chem' }),
    note('list', [checklistToken(B), 'after'].join('\n'), { updatedAt: '2026-10-02T10:00:00Z' }),
    note('gone', 'Deleted', { deletedAt: '2026-10-02T10:00:00Z' }),
  ];
  const all = buildNotes(notes, tasks);
  assert.deepEqual(all.map((s) => [s.note.id, s.title, s.preview]), [
    ['lecture', 'Lecture 7', 'Mitochondria make ATP.'],
    ['list', 'Lab report', 'after'],
    ['old', 'Groceries', 'Milk'],
  ]);
  assert.deepEqual(all[0].progress, { done: 1, total: 2 }, 'a deleted task’s line doesn’t count');
  assert.deepEqual(buildNotes(notes, tasks, 'chem').map((s) => s.note.id), ['lecture']);
  assert.deepEqual(buildNotes(notes, tasks, null).map((s) => s.note.id), ['list']);
});

test('a note has content once it has words or a checklist line', () => {
  assert.equal(noteHasContent(''), false);
  assert.equal(noteHasContent('  \n \n'), false);
  assert.equal(noteHasContent('Hi'), true);
  assert.equal(noteHasContent(checklistToken(A)), true);
});

test('the title is the first line; the editor splits it off and joins it back', () => {
  assert.deepEqual(splitTitle(body), { title: 'Lecture 7', rest: body.slice('Lecture 7\n'.length) });
  assert.deepEqual(splitTitle('Just a title'), { title: 'Just a title', rest: '' });
  assert.deepEqual(splitTitle(''), { title: '', rest: '' });
  assert.deepEqual(splitTitle(checklistToken(A)), { title: '', rest: checklistToken(A) }, 'a checklist line is never the title line');
  for (const b of [body, 'Just a title', 'A\n\nB', 'A\nB\n']) {
    const { title, rest } = splitTitle(b);
    assert.equal(joinTitle(title, rest), b);
  }
  assert.equal(joinTitle(...(Object.values(splitTitle('Title\n')) as [string, string])), 'Title', 'an empty line after a lone title is dropped');
  assert.equal(joinTitle('', checklistToken(A)), `\n${checklistToken(A)}`);
});

test('notes page newest first, ties broken by id, as the server orders them', () => {
  const at = (updatedAt: string, id: string) => ({ updatedAt, id });
  const older = at('2026-10-06T14:10:51.65+00:00', 'b');
  const newer = at('2026-10-06T14:10:51.650275+00:00', 'a');
  const sameTimeLowId = at('2026-10-06T14:10:51.65+00:00', 'a');
  assert.deepEqual([older, sameTimeLowId, newer].sort(byRecency), [newer, older, sameTimeLowId]);

  assert.equal(withinPages(older, null), true, 'nothing paged yet: everything counts');
  assert.equal(withinPages(newer, older), true);
  assert.equal(withinPages(older, older), true, 'the last note of the page is in it');
  assert.equal(withinPages(sameTimeLowId, older), false, 'same moment, after it in the order');
  assert.equal(withinPages(at('2026-10-05T09:00:00+00:00', 'z'), older), false);
});
