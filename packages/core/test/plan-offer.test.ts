import assert from 'node:assert/strict';
import test from 'node:test';

import { offersPlan, suggestsPlan } from '../src/plan-offer.ts';
import type { Task } from '../src/types.ts';
import { BIG, SMALL, UNSEEN_BIG, UNSEEN_SMALL } from './plan-offer-cases.ts';

test('"Plan it" is offered for big or vague tasks', () => {
  const missed = [...BIG, ...UNSEEN_BIG].filter((title) => !suggestsPlan(title));
  assert.deepEqual(missed, []);
});

test('errands never get "Plan it", whatever they mention', () => {
  const offered = [...SMALL, ...UNSEEN_SMALL].filter((title) => suggestsPlan(title));
  assert.deepEqual(offered, []);
});

test('the way a title is typed doesn’t change the answer', () => {
  for (const title of ['  STUDY FOR ORGO MIDTERM ', 'Need to finish the essay!', 'Don’t forget to start my lit review', 'Chem: study for unit 3 test', 'Bio 101: final project', 'Study for exam at 2:00', 'Writing my thesis']) {
    assert.equal(suggestsPlan(title), true, title);
  }
  for (const title of ['email dr. ruiz re: the quiz', 'Remember to turn in the essay', 'Essay: email TA about the deadline', '', '   ']) {
    assert.equal(suggestsPlan(title), false, title);
  }
});

test('a row offers "Plan it" only on a big task of their own with no plan yet', () => {
  const task: Pick<Task, 'title' | 'parentId' | 'noteId' | 'source' | 'status' | 'rrule' | 'estimateMinutes'> = {
    title: 'Study for chem midterm', parentId: null, noteId: null, source: 'self', status: 'in_progress', rrule: null, estimateMinutes: null,
  };
  assert.equal(offersPlan(task, false), true);
  assert.equal(offersPlan(task, true), false, 'already planned');
  assert.equal(offersPlan({ ...task, parentId: 'p' }, false), false, 'a step');
  assert.equal(offersPlan({ ...task, source: 'ai' }, false), false, 'made by Plan it');
  assert.equal(offersPlan({ ...task, noteId: 'n' }, false), false, "a note's checklist line");
  assert.equal(offersPlan({ ...task, status: 'completed' }, false), false, 'done');
  assert.equal(offersPlan({ ...task, title: 'Practice piano', rrule: 'FREQ=DAILY' }, false), false, 'a habit');
  assert.equal(offersPlan({ ...task, estimateMinutes: 30 }, false), false, 'they said half an hour');
  assert.equal(offersPlan({ ...task, estimateMinutes: 90 }, false), true);
  assert.equal(offersPlan({ ...task, title: 'Buy stamps' }, false), false);
});
