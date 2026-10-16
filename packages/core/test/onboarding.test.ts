import assert from 'node:assert/strict';
import { test } from 'node:test';

import { voice } from '../src/nation.ts';
import { hoursChange, nextPage, oathTask, resumePage } from '../src/onboarding.ts';
import { parseQuickAdd } from '../src/quick-add.ts';

test('coming back picks up at the first page not done', () => {
  assert.equal(resumePage({}, false, false), 'welcome');
  assert.equal(resumePage({ reminders: { morningList: { on: true, hour: 8, minute: 0 } } }, false, false), 'welcome', 'other settings are not answers');
  assert.equal(resumePage({}, true, false), 'birth', 'named (Sign in with Apple gives a name): the age check next');
  assert.equal(resumePage({}, true, true), 'purpose', 'named and checked, nothing else yet');
  assert.equal(resumePage({ persona: 'school' }, true, true), 'hours');
  assert.equal(resumePage({ persona: 'school', hours: 'night' }, true, true), 'style');
  assert.equal(resumePage({ persona: 'school', hours: 'night', style: 'avoid' }, true, true), 'notBroken', 'the self-forgiveness page is seen before the tone');
  assert.equal(resumePage({ persona: 'school', hours: 'night', style: 'avoid', nudgeTone: 'roast' }, true, true), 'result', 'then the result and how PN helps');
  assert.equal(resumePage({ persona: 'school', hours: 'night', style: 'avoid', nudgeTone: 'roast', heardFrom: 'tiktok' }, true, true), 'oath');
  assert.equal(resumePage({ hours: 'day' }, true, true), 'purpose');
  const answered = { persona: 'school', hours: 'night', style: 'avoid', nudgeTone: 'roast', heardFrom: 'tiktok' } as const;
  assert.equal(resumePage(answered, false, false), 'name', 'answers from before the name page was added: asked for it first');
  assert.equal(resumePage(answered, true, false), 'birth', 'answers from before the age check was added: nobody goes on without it');
});

test('a passport that holds the Oath’s plan, or finished unsaved, comes back to saving it', () => {
  const answered = { persona: 'school', hours: 'night', style: 'avoid', nudgeTone: 'roast', heardFrom: 'tiktok' } as const;
  assert.equal(resumePage(answered, true, true, { unsaved: true }), 'oath', 'no plan yet: the Oath');
  assert.equal(resumePage(answered, true, true, { unsaved: true, planned: true }), 'save', 'left on Approved or Save: not the Oath again');
  assert.equal(resumePage(answered, true, true, { planned: true }), 'approved', 'saved already (Apple, Google): nothing to save');
  assert.equal(resumePage({}, true, true, { unsaved: true, finished: true }), 'save', 'finished unsaved, questions skipped: only the save is left');
  assert.equal(resumePage(answered, true, false, { unsaved: true, finished: true }), 'birth', 'still nobody gets past the age check');
  assert.equal(resumePage({ persona: 'school' }, true, true, { unsaved: true, planned: true }), 'hours', 'unanswered questions come first');
});

test('the pages turn in order; a passport that finished unsaved goes from its name and age check to saving', () => {
  assert.equal(nextPage('welcome'), 'name');
  assert.equal(nextPage('name'), 'birth');
  assert.equal(nextPage('birth'), 'purpose');
  assert.equal(nextPage('approved'), 'save');
  assert.equal(nextPage('save'), 'save', 'the last page stays put');
  assert.equal(nextPage('name', true, false), 'birth', 'finished before the age check existed: that next');
  assert.equal(nextPage('name', true, true), 'save', 'finished before the name page existed: then saving');
  assert.equal(nextPage('birth', true, true), 'save');
  assert.equal(nextPage('welcome', true, false), 'name');
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
  const typed = oathTask(parseQuickAdd('history essay due fri', now), '2026-10-14');
  assert.deepEqual([typed.title, typed.dueOn], ['history essay', '2026-10-09']);
  const picked = (dueOn: string | null) => oathTask(parseQuickAdd('Clean my room', now), dueOn).dueOn;
  assert.deepEqual([picked(today), picked('2026-10-20'), picked(null)], [today, '2026-10-20', null]);
});

test('the Oath plans one go at a repeat: its words leave the title, and it’s due when they picked', () => {
  const now = new Date(2026, 9, 15, 10, 0); // Thursday
  const walk = oathTask(parseQuickAdd('walk the dog every M/W/Sat', now), '2026-10-16');
  assert.deepEqual(
    [walk.title, walk.rrule, walk.scheduledOn, walk.dueOn, walk.matches],
    ['walk the dog', null, null, '2026-10-16', []],
  );
  const typed = oathTask(parseQuickAdd('run every day starting tomorrow', now), '2026-10-22');
  assert.deepEqual([typed.rrule, typed.scheduledOn], [null, '2026-10-16'], 'a typed day stays');
  for (const due of [null, '2026-10-22']) {
    const timed = oathTask(parseQuickAdd('walk the dog every day 6pm', now), due);
    assert.deepEqual([timed.rrule, timed.scheduledOn, timed.dueOn, timed.time], [null, '2026-10-15', null, { hour: 18, minute: 0 }], `so does a typed time (${due})`);
  }
  const once = oathTask(parseQuickAdd('study for exam 6pm', now), '2026-10-22');
  assert.deepEqual([once.scheduledOn, once.dueOn], ['2026-10-15', null], 'as for a one-off with a time');
});

test('changing hours moves the morning list only while it is off', () => {
  assert.deepEqual(hoursChange('night', {}), {
    preferences: { hours: 'night', reminders: { morningList: { on: false, hour: 10, minute: 0 } } },
    dayRolloverHour: 0,
  });
  const on = { reminders: { morningList: { on: true, hour: 6, minute: 30 } } };
  assert.deepEqual(hoursChange('early', on).preferences.reminders?.morningList, { on: true, hour: 6, minute: 30 });
  assert.equal(hoursChange('early', on).dayRolloverHour, 0);
});
