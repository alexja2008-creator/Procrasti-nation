import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Task } from '../src/types.ts';
import { buildUpcoming, previewWords, upcomingCounts, upcomingDayLabel, upcomingSectionFor, type UpcomingEntry } from '../src/upcoming.ts';

const TODAY = '2026-10-06'; // a Tuesday
const at = (day: number, hour: number, month = 10) => new Date(2026, month - 1, day, hour, 0).toISOString();

function task(id: string, fields: Partial<Task> = {}): Task {
  return {
    id, userId: 'u1', listId: null, parentId: null, title: id, notes: null, status: 'in_progress',
    dueOn: null, dueAt: null, remindAt: null, rrule: null, estimateMinutes: null, scheduledOn: null,
    sortOrder: 0, source: 'self', externalId: null, completedAt: null,
    createdAt: at(1, 9), updatedAt: at(1, 9), deletedAt: null, ...fields,
  };
}

const done = { status: 'completed' as const, completedAt: at(5, 9) };
// A deadline marker is `due:id`, a repeat's preview `~id`.
const ids = (entries: UpcomingEntry[]) =>
  entries.map((e) => (e.kind === 'deadline' ? `due:${e.task.id}` : e.kind === 'preview' ? `~${e.task.id}` : e.task.id));
const day = (view: ReturnType<typeof buildUpcoming>, date: string) => view.days.find((d) => d.date === date);

test('range: seven days always, then only busy days up to 8 weeks, then Later', () => {
  const view = buildUpcoming(
    [
      task('in-a-week', { scheduledOn: '2026-10-13' }),
      task('in-two-weeks', { scheduledOn: '2026-10-20' }),
      task('last-day', { scheduledOn: '2026-12-01' }), // today + 56
      task('beyond', { dueOn: '2026-12-02' }),
      task('way-beyond', { scheduledOn: '2027-03-01' }),
    ],
    TODAY,
  );
  assert.deepEqual(
    view.days.map((d) => d.date),
    ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-20', '2026-12-01'],
  );
  assert.deepEqual(view.days.slice(0, 6).map((d) => d.entries.length), [0, 0, 0, 0, 0, 0], 'empty days still show');
  assert.deepEqual(ids(view.later), ['beyond', 'way-beyond'], 'Later is sorted by date');
  assert.equal(buildUpcoming([], TODAY, { weeks: 2 }).days.length, 7);
  assert.deepEqual(
    buildUpcoming([task('a', { scheduledOn: '2026-10-21' })], TODAY, { weeks: 2 }).later.map((e) => e.task.id),
    ['a'],
    'the horizon follows `weeks`',
  );
});

test('nothing from today or earlier; finished and deleted items hidden', () => {
  const view = buildUpcoming(
    [
      task('today', { scheduledOn: TODAY }),
      task('missed', { scheduledOn: '2026-10-02' }),
      task('due-today', { dueOn: TODAY }),
      task('undated'),
      task('finished', { scheduledOn: '2026-10-07', ...done }),
      task('deleted', { scheduledOn: '2026-10-07', deletedAt: at(5, 9) }),
      task('tomorrow', { scheduledOn: '2026-10-07' }),
    ],
    TODAY,
  );
  assert.deepEqual(view.days.flatMap((d) => ids(d.entries)), ['tomorrow']);
  assert.deepEqual(view.later, []);
});

test('a repeat shows each turn in the week ahead: the next one real, the later ones previews', () => {
  // Tuesday 6 Oct; the fixed days run Wed 7 to Tue 13.
  const view = buildUpcoming(
    [
      task('walk', { scheduledOn: '2026-10-07', rrule: 'FREQ=DAILY', remindAt: at(7, 18) }),
      task('stretch', { scheduledOn: TODAY, rrule: 'FREQ=DAILY' }), // today's turn is on Today
      task('bio', { scheduledOn: '2026-10-07', rrule: 'FREQ=WEEKLY;BYDAY=MO,WE' }), // bio lab, Mon and Wed
      task('biweekly', { scheduledOn: '2026-10-08', rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH' }),
      task('missed', { scheduledOn: '2026-10-05', rrule: 'FREQ=WEEKLY;BYDAY=MO,TH' }), // Monday's turn carried over to Today
      task('far', { scheduledOn: '2026-10-20', rrule: 'FREQ=WEEKLY;BYDAY=TU' }),
      task('finished', { scheduledOn: '2026-10-07', rrule: 'FREQ=DAILY', ...done }),
    ],
    TODAY,
  );
  const on = (date: string) => ids(day(view, date)?.entries ?? []).sort();
  assert.deepEqual(on('2026-10-07'), ['bio', 'walk', '~stretch'].sort());
  assert.deepEqual(on('2026-10-08'), ['biweekly', '~missed', '~stretch', '~walk'].sort());
  assert.deepEqual(on('2026-10-12'), ['~bio', '~missed', '~stretch', '~walk'].sort(), 'Monday: bio lab’s second turn');
  assert.deepEqual(on('2026-10-13'), ['~stretch', '~walk'].sort(), 'every other week: not its off week');
  assert.ok(!view.days.some((d) => d.date > '2026-10-13' && d.entries.some((e) => e.kind === 'preview')), 'previews only in the 7 days');
  assert.deepEqual(ids(view.days.find((d) => d.date === '2026-10-20')!.entries), ['far'], 'beyond them, once');

  const previews = (id: string) => view.days.flatMap((d) => d.entries).filter((e) => e.kind === 'preview' && e.task.id === id);
  assert.deepEqual(previews('walk').map((e) => e.opensAfter), ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']);
  assert.ok(previews('walk').every((e) => e.at === at(Number(e.date.slice(8)), 18)), 'each turn keeps its 6 PM');
  assert.equal(previews('stretch')[0].opensAfter, TODAY, 'opens after today’s turn');
  assert.deepEqual([previews('missed')[0].date, previews('missed')[0].opensAfter], ['2026-10-08', TODAY], 'a missed turn shows once, on Today');
  assert.equal(previews('bio')[0].opensAfter, '2026-10-07');
  assert.equal(upcomingCounts(view)['2026-10-12'], 4, 'the dots count previews');
});

test('a preview says when it opens', () => {
  const view = buildUpcoming(
    [task('bio', { scheduledOn: '2026-10-12', rrule: 'FREQ=WEEKLY;BYDAY=MO,TU' }), task('stretch', { scheduledOn: TODAY, rrule: 'FREQ=DAILY' })],
    TODAY,
  );
  const preview = (id: string, date: string) => view.days.find((d) => d.date === date)!.entries.find((e) => e.task.id === id)!;
  assert.deepEqual(previewWords(preview('bio', '2026-10-13'), TODAY), {
    line: 'Repeats · opens after Mon',
    notice: 'Tuesday’s turn opens once Monday’s is done.',
  });
  assert.deepEqual(previewWords(preview('stretch', '2026-10-07'), TODAY), {
    line: 'Repeats · opens after today',
    notice: 'Tomorrow’s turn opens once today’s is done.',
  });
  assert.equal(previewWords(preview('bio', '2026-10-12'), TODAY), null, 'the real row isn’t a preview');
});

test('a preview keeps its time across the end of daylight saving', () => {
  const before = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    // Thursday 29 October; clocks go back on Sunday 1 November.
    const today = '2026-10-29';
    const view = buildUpcoming([task('walk', { scheduledOn: '2026-10-30', rrule: 'FREQ=DAILY', remindAt: new Date(2026, 9, 30, 18, 0).toISOString() })], today);
    const monday = view.days.find((d) => d.date === '2026-11-02')!.entries[0];
    assert.equal(monday.kind, 'preview');
    assert.deepEqual([new Date(monday.at!).getHours(), new Date(monday.at!).getMinutes()], [18, 0]);
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
});

test('a repeat’s turn moved by hand moves its previews’ “opens after”', () => {
  // Bio lab (Mon/Wed) moved from Wed 7 to Thu 8 with Move to….
  const view = buildUpcoming([task('bio', { scheduledOn: '2026-10-08', rrule: 'FREQ=WEEKLY;BYDAY=MO,WE' })], TODAY);
  const entries = view.days.flatMap((d) => d.entries);
  assert.deepEqual(entries.map((e) => [e.kind, e.date, e.opensAfter ?? null]), [['task', '2026-10-08', null], ['preview', '2026-10-12', '2026-10-08']]);
});

test('deadlines: a due-only task is a to-do on its due day; work done elsewhere gets a marker', () => {
  const view = buildUpcoming(
    [
      task('essay', { dueOn: '2026-10-10', dueAt: at(10, 17) }),
      task('report', { scheduledOn: '2026-10-08', dueOn: '2026-10-12' }),
      task('late-start', { scheduledOn: '2026-10-02', dueOn: '2026-10-09' }),
      task('same-day', { scheduledOn: '2026-10-11', dueOn: '2026-10-11' }),
    ],
    TODAY,
  );
  assert.deepEqual(ids(day(view, '2026-10-10')!.entries), ['essay']);
  assert.equal(day(view, '2026-10-10')!.entries[0].at, at(10, 17), 'a due-only task’s time is its due time');
  assert.deepEqual(ids(day(view, '2026-10-08')!.entries), ['report']);
  assert.equal(day(view, '2026-10-08')!.entries[0].at, null, 'a scheduled task doesn’t borrow its due time');
  assert.deepEqual(ids(day(view, '2026-10-12')!.entries), ['due:report']);
  assert.deepEqual(ids(day(view, '2026-10-09')!.entries), ['due:late-start'], 'still marked when its work day is on Today');
  assert.deepEqual(ids(day(view, '2026-10-11')!.entries), ['same-day'], 'no marker when it’s done on its due day');
});

test('plans: steps show on their days with context; the parent only marks its deadline', () => {
  const tasks = [
    task('paper', { title: 'History paper', dueOn: '2026-10-09' }),
    task('s1', { parentId: 'paper', sortOrder: 1, scheduledOn: '2026-10-05', ...done }),
    task('s2', { parentId: 'paper', sortOrder: 2, scheduledOn: TODAY }),
    task('s3', { parentId: 'paper', sortOrder: 3, scheduledOn: '2026-10-07', estimateMinutes: 45 }),
    task('s4', { parentId: 'paper', sortOrder: 4, scheduledOn: '2026-10-09' }),
  ];
  const view = buildUpcoming(tasks, TODAY);
  const s3 = day(view, '2026-10-07')!.entries[0];
  assert.deepEqual([s3.task.id, s3.parentTitle, s3.stepIndex, s3.stepCount], ['s3', 'History paper', 3, 4]);
  assert.deepEqual(ids(day(view, '2026-10-09')!.entries), ['due:paper', 's4'], 'deadline marker before untimed to-dos');
  assert.equal(view.days.flatMap((d) => d.entries).filter((e) => e.task.id === 'paper').length, 1);

  const allDone = buildUpcoming(
    tasks.map((t) => (t.parentId ? { ...t, ...done } : t)),
    TODAY,
  );
  assert.deepEqual(ids(day(allDone, '2026-10-09')!.entries), ['paper'], 'with every step done, the plan itself is the to-do');
});

test('order within a day: timed by time, then deadlines, then as arranged', () => {
  const view = buildUpcoming(
    [
      task('later-added', { scheduledOn: '2026-10-08', sortOrder: 20 }),
      task('evening', { scheduledOn: '2026-10-08', remindAt: at(8, 19), sortOrder: 1 }),
      task('first-added', { scheduledOn: '2026-10-08', sortOrder: 10 }),
      task('due-at-noon', { dueOn: '2026-10-08', dueAt: at(8, 12), sortOrder: 30 }),
      task('deadline', { scheduledOn: '2026-10-07', dueOn: '2026-10-08', sortOrder: 5 }),
      task('morning', { scheduledOn: '2026-10-08', remindAt: at(8, 9), sortOrder: 2 }),
    ],
    TODAY,
  );
  assert.deepEqual(ids(day(view, '2026-10-08')!.entries), [
    'morning',
    'due-at-noon',
    'evening',
    'due:deadline',
    'first-added',
    'later-added',
  ]);
});

test('day labels spell out tomorrow', () => {
  assert.equal(upcomingDayLabel('2026-10-07', TODAY), 'Tomorrow · Wed 7 Oct');
  assert.equal(upcomingDayLabel('2026-10-08', TODAY), 'Thu 8 Oct');
  assert.equal(upcomingDayLabel('2026-11-02', TODAY), 'Mon 2 Nov');
});

test('calendar: dots count every entry; a picked day finds its section', () => {
  const view = buildUpcoming(
    [
      task('a', { scheduledOn: '2026-10-08' }),
      task('b', { scheduledOn: '2026-10-08', dueOn: '2026-10-09' }),
      task('c', { scheduledOn: '2026-10-20' }),
      task('d', { scheduledOn: '2027-01-15' }),
    ],
    TODAY,
  );
  assert.deepEqual(upcomingCounts(view), { '2026-10-08': 2, '2026-10-09': 1, '2026-10-20': 1, '2027-01-15': 1 });
  assert.equal(upcomingSectionFor(view, '2026-10-09'), '2026-10-09');
  assert.equal(upcomingSectionFor(view, '2026-10-15'), '2026-10-20', 'an empty later day finds the next one listed');
  assert.equal(upcomingSectionFor(view, '2026-11-30'), 'later');
  assert.equal(upcomingSectionFor(view, TODAY), '2026-10-07', 'today lands on tomorrow');
  assert.equal(upcomingSectionFor(buildUpcoming([], TODAY), '2026-11-30'), '2026-10-13', 'nothing later: the last day');
});
