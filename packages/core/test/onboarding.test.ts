import assert from 'node:assert/strict';
import { test } from 'node:test';

import { voice } from '../src/nation.ts';
import { APPLICATION_PAGES, morningTimeFor, pageNumber, resumePage, rolloverFor, territoriesFor } from '../src/onboarding.ts';

test('the questions are numbered; welcome and approved are not', () => {
  assert.deepEqual(APPLICATION_PAGES.map(pageNumber), [null, { n: 1, of: 5 }, { n: 2, of: 5 }, { n: 3, of: 5 }, { n: 4, of: 5 }, { n: 5, of: 5 }, null]);
});

test('coming back picks up at the first page not done', () => {
  assert.equal(resumePage({}), 'welcome');
  assert.equal(resumePage({ reminders: { morningList: { on: true, hour: 8, minute: 0 } } }), 'welcome', 'other settings are not answers');
  assert.equal(resumePage({ persona: 'school' }), 'hours');
  assert.equal(resumePage({ persona: 'school', hours: 'night' }), 'style');
  assert.equal(resumePage({ persona: 'school', hours: 'night', style: 'avoid' }), 'notBroken', 'the self-forgiveness page is seen before the tone');
  assert.equal(resumePage({ persona: 'school', hours: 'night', style: 'avoid', nudgeTone: 'roast' }), 'approved');
  assert.equal(resumePage({ hours: 'day' }), 'purpose');
});

test('a purpose of visit starts the matching territories', () => {
  const names = (p: Parameters<typeof territoriesFor>[0]) => territoriesFor(p).map((t) => `${t.name}/${t.kind}/${t.ink}`);
  assert.deepEqual(names('school'), ['School/school/violet']);
  assert.deepEqual(names('work'), ['Work/work/terracotta']);
  assert.deepEqual(names('both'), ['School/school/violet', 'Work/work/terracotta']);
  assert.deepEqual(names('life'), ['Home/home/forest']);
});

test('hours set when the day ends and the morning list time', () => {
  assert.deepEqual(['early', 'day', 'night'].map((h) => rolloverFor(h as 'early')), [0, 0, 3]);
  assert.deepEqual(morningTimeFor('early'), { hour: 7, minute: 0 });
  assert.deepEqual(morningTimeFor('day'), { hour: 8, minute: 0 });
  assert.deepEqual(morningTimeFor('night'), { hour: 10, minute: 0 });
});

test('every answer option has words, and the ids match the data model', () => {
  const a = voice.application;
  assert.deepEqual(a.purposes.map((p) => p.id), ['school', 'work', 'both', 'life']);
  assert.deepEqual(a.hours.map((p) => p.id), ['early', 'day', 'night']);
  assert.deepEqual(a.styles.map((p) => p.id), ['avoid', 'perfectionist', 'overwhelmed', 'bored']);
  for (const option of [...a.purposes, ...a.hours, ...a.styles]) assert.ok(option.label && option.hint);
});
