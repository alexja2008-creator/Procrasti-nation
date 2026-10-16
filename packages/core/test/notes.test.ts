import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  byRecency,
  checklistIds,
  checklistToken,
  checklistToLine,
  insertChecklistLine,
  joinTitle,
  lineToChecklist,
  noteHasContent,
  parseNoteBody,
  removeChecklistLine,
  serializeNoteBody,
  splitTitle,
  withinPages,
  type NoteBlock,
} from '../src/notes.ts';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

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
