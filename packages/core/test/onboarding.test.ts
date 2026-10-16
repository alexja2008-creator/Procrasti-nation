import assert from 'node:assert/strict';
import { test } from 'node:test';

import { voice } from '../src/nation.ts';
import {
  APPLICATION_PAGES,
  firstStepOf,
  firstWeekOf,
  helpCardsFor,
  hoursChange,
  morningTimeFor,
  oathTask,
  pageNumber,
  resultAudience,
  nextPage,
  resumePage,
  territoriesFor,
} from '../src/onboarding.ts';
import { parseQuickAdd } from '../src/quick-add.ts';

test('the questions are numbered through the Oath; the rest are not', () => {
  assert.deepEqual(
    APPLICATION_PAGES.map((p) => pageNumber(p)?.n ?? null),
    [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, null, null, null, null, null],
  );
  assert.deepEqual(APPLICATION_PAGES.slice(0, 4), ['welcome', 'name', 'birth', 'purpose'], 'their name comes first, right after Welcome, then the age check');
  assert.ok(APPLICATION_PAGES.indexOf('birth') < APPLICATION_PAGES.indexOf('heardFrom'), 'the age check comes before the passport opens');
  assert.equal(pageNumber('name')?.n, 1);
  assert.equal(pageNumber('oath')?.of, 11);
});

test('how PN helps: what answers their reason comes first', () => {
  assert.equal(helpCardsFor('overwhelmed')[0], 'planIt');
  assert.equal(helpCardsFor('avoid')[0], 'startMode');
  assert.equal(helpCardsFor('perfectionist')[0], 'roughFirst');
  assert.equal(helpCardsFor('bored')[0], 'stamps');
  assert.equal(helpCardsFor(undefined).length, 3);
  assert.equal(resultAudience('school'), 'students');
  assert.equal(resultAudience('both'), 'students');
  assert.equal(resultAudience('work'), 'adults');
  assert.equal(resultAudience('life'), 'adults');
});

test("your first week: the Oath's steps on their days, today through six days on", () => {
  const step = (id: string, scheduledOn: string | null, sortOrder: number, extra: object = {}) =>
    ({ id, parentId: 'oath', scheduledOn, sortOrder, deletedAt: null, ...extra }) as never;
  const tasks = [
    step('b', '2026-10-08', 2),
    step('a', '2026-10-07', 1),
    step('c', '2026-10-08', 3),
    step('late', '2026-10-14', 4),
    step('undated', null, 5),
    step('gone', '2026-10-09', 6, { deletedAt: '2026-10-07T00:00:00Z' }),
    { id: 'other', parentId: 'elsewhere', scheduledOn: '2026-10-07', sortOrder: 0, deletedAt: null } as never,
  ];
  const week = firstWeekOf(tasks, 'oath', '2026-10-07');
  assert.deepEqual(
    week.map((d) => [d.day, d.steps.map((t: { id: string }) => t.id)]),
    [
      ['2026-10-07', ['a']],
      ['2026-10-08', ['b', 'c']],
    ],
  );
});

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

test('a purpose of visit starts the matching territories', () => {
  const names = (p: Parameters<typeof territoriesFor>[0]) => territoriesFor(p).map((t) => `${t.name}/${t.kind}/${t.ink}`);
  assert.deepEqual(names('school'), ['School/school/violet']);
  assert.deepEqual(names('work'), ['Work/work/terracotta']);
  assert.deepEqual(names('both'), ['School/school/violet', 'Work/work/terracotta']);
  assert.deepEqual(names('life'), ['Home/home/forest']);
});

test('hours set the morning list time; every answer ends the day at midnight', () => {
  assert.deepEqual(['early', 'day', 'night'].map((h) => hoursChange(h as 'early', {}).dayRolloverHour), [0, 0, 0]);
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

test('the Oath plans one go at a repeat: its words leave the title, and it’s due when they picked', () => {
  const now = new Date(2026, 9, 15, 10, 0); // Thursday
  const walk = oathTask(parseQuickAdd('walk the dog every M/W/Sat', now), 'tomorrow', '2026-10-15');
  assert.deepEqual(
    [walk.title, walk.rrule, walk.scheduledOn, walk.dueOn, walk.matches],
    ['walk the dog', null, null, '2026-10-16', []],
  );
  const typed = oathTask(parseQuickAdd('run every day starting tomorrow', now), 'week', '2026-10-15');
  assert.deepEqual([typed.rrule, typed.scheduledOn], [null, '2026-10-16'], 'a typed day stays');
  for (const due of ['none', 'week'] as const) {
    const timed = oathTask(parseQuickAdd('walk the dog every day 6pm', now), due, '2026-10-15');
    assert.deepEqual([timed.rrule, timed.scheduledOn, timed.dueOn, timed.time], [null, '2026-10-15', null, { hour: 18, minute: 0 }], `so does a typed time (${due})`);
  }
  const once = oathTask(parseQuickAdd('study for exam 6pm', now), 'week', '2026-10-15');
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

test('the first Declaration is for the plan’s first open step', () => {
  const base = { userId: 'u', listId: null, noteId: null, notes: null, status: 'in_progress' as const, dueOn: null, dueAt: null,
    remindAt: null, declaredAt: null, rrule: null, estimateMinutes: null, scheduledOn: '2026-10-12', source: 'ai' as const,
    externalId: null, completedAt: null, createdAt: '2026-10-12T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z', deletedAt: null };
  const tasks = [
    { ...base, id: 'oath', parentId: null, title: 'Study for chem midterm', sortOrder: 0, source: 'self' as const },
    { ...base, id: 's2', parentId: 'oath', title: 'Make flashcards', sortOrder: 2 },
    { ...base, id: 's1', parentId: 'oath', title: 'List the chapters', sortOrder: 1, completedAt: '2026-10-12T15:00:00Z', status: 'completed' as const },
    { ...base, id: 's0', parentId: 'oath', title: 'Gone', sortOrder: 0, deletedAt: '2026-10-12T15:00:00Z' },
    { ...base, id: 's3', parentId: 'oath', title: 'Practice test', sortOrder: 3 },
  ];
  assert.equal(firstStepOf(tasks, 'oath')?.id, 's2', 'finished and deleted steps are passed over');
  assert.equal(firstStepOf(tasks, 'nothing'), null);
});
