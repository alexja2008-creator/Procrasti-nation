import assert from 'node:assert/strict';
import { test } from 'node:test';

import { voice } from '../src/nation.ts';
import { APPLICATION_PAGES, hoursChange, morningTimeFor, oathTask, pageNumber, resumePage, rolloverFor, territoriesFor } from '../src/onboarding.ts';
import { parseQuickAdd } from '../src/quick-add.ts';

test('the questions are numbered; welcome and approved are not', () => {
  assert.deepEqual(
    APPLICATION_PAGES.map((p) => pageNumber(p)?.n ?? null),
    [null, 1, 2, 3, 4, 5, 6, null],
  );
  assert.equal(pageNumber('oath')?.of, 6);
});

test('coming back picks up at the first page not done', () => {
  assert.equal(resumePage({}), 'welcome');
  assert.equal(resumePage({ reminders: { morningList: { on: true, hour: 8, minute: 0 } } }), 'welcome', 'other settings are not answers');
  assert.equal(resumePage({ persona: 'school' }), 'hours');
  assert.equal(resumePage({ persona: 'school', hours: 'night' }), 'style');
  assert.equal(resumePage({ persona: 'school', hours: 'night', style: 'avoid' }), 'notBroken', 'the self-forgiveness page is seen before the tone');
  assert.equal(resumePage({ persona: 'school', hours: 'night', style: 'avoid', nudgeTone: 'roast' }), 'oath');
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

test('the Oath: a typed date wins, else due when they picked', () => {
  const now = new Date(2026, 9, 7, 9, 0); // Wednesday
  const today = '2026-10-07';
  const typed = oathTask(parseQuickAdd('history essay due fri', now), 'week', today);
  assert.deepEqual([typed.title, typed.dueOn], ['history essay', '2026-10-09']);
  const picked = (due: Parameters<typeof oathTask>[1]) => oathTask(parseQuickAdd('Clean my room', now), due, today).dueOn;
  assert.deepEqual([picked('today'), picked('tomorrow'), picked('week'), picked('none')], ['2026-10-07', '2026-10-08', '2026-10-14', null]);
});

test('changing hours moves the morning list only while it is off', () => {
  assert.deepEqual(hoursChange('night', {}), {
    preferences: { hours: 'night', reminders: { morningList: { on: false, hour: 10, minute: 0 } } },
    dayRolloverHour: 3,
  });
  const on = { reminders: { morningList: { on: true, hour: 6, minute: 30 } } };
  assert.deepEqual(hoursChange('early', on).preferences.reminders?.morningList, { on: true, hour: 6, minute: 30 });
  assert.equal(hoursChange('early', on).dayRolloverHour, 0);
});
