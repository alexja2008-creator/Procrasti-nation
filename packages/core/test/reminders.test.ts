import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_PENDING, parseReminderId, planReminders, reminderChanges, snoozeOf } from '../src/reminders.ts';
import { checkOff } from '../src/tasks.ts';
import type { List, Task } from '../src/types.ts';

// Tuesday 6 October 2026, noon (local time).
const NOW = new Date(2026, 9, 6, 12, 0);
const TODAY = '2026-10-06';
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const ms = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();

function task(id: string, fields: Partial<Task> = {}): Task {
  return {
    id, userId: 'u1', listId: null, parentId: null, noteId: null, title: id, notes: null, status: 'in_progress',
    dueOn: null, dueAt: null, remindAt: null, rrule: null, estimateMinutes: null, scheduledOn: null,
    sortOrder: 0, source: 'self', externalId: null, completedAt: null,
    createdAt: at(1, 9), updatedAt: at(1, 9), deletedAt: null, ...fields,
  };
}

const home: List = {
  id: 'home', userId: 'u1', name: 'Home', kind: 'home', ink: 'forest', sortOrder: 1,
  createdAt: at(1, 9), updatedAt: at(1, 9), deletedAt: null,
};

test('a task with a time rings at that time; past, finished and deleted ones stay quiet', () => {
  const plan = planReminders(
    [
      task('call', { title: 'Call mom', scheduledOn: TODAY, remindAt: at(6, 17) }),
      task('missed', { scheduledOn: '2026-10-05', remindAt: at(5, 18) }),
      task('this-morning', { scheduledOn: TODAY, remindAt: at(6, 9) }),
      task('finished', { scheduledOn: TODAY, remindAt: at(6, 19), status: 'completed', completedAt: at(6, 10) }),
      task('deleted', { scheduledOn: TODAY, remindAt: at(6, 20), deletedAt: at(6, 10) }),
      task('untimed', { scheduledOn: TODAY }),
      task('far', { scheduledOn: '2026-10-25', remindAt: at(25, 9) }),
    ],
    NOW,
  );
  assert.deepEqual(plan, [
    { id: `task:call:${ms(6, 17)}`, kind: 'task', taskId: 'call', at: ms(6, 17), day: TODAY, title: 'Call mom', body: '' },
  ]);
});

test('a timed deadline rings at its due time, once if it matches the task time', () => {
  const plan = planReminders(
    [
      task('essay', { title: 'Essay', dueOn: '2026-10-09', dueAt: at(9, 17), listId: 'home' }),
      task('both', { scheduledOn: TODAY, remindAt: at(6, 15), dueOn: TODAY, dueAt: at(6, 15) }),
      task('due-untimed', { dueOn: '2026-10-08' }),
    ],
    NOW,
    { lists: [home] },
  );
  assert.deepEqual(
    plan.map((r) => [r.id, r.title, r.body]),
    [
      [`task:both:${ms(6, 15)}`, 'both', ''],
      [`due:essay:${ms(9, 17)}`, 'Essay is due at 5:00 PM', 'Home'],
    ],
  );
});

test('a repeat rings each time it comes round, missed days or not', () => {
  const walk = task('walk', { title: 'Walk Biscuit', scheduledOn: '2026-10-04', remindAt: at(4, 18), rrule: 'FREQ=DAILY', listId: 'home' });
  const plan = planReminders([walk], NOW, { lists: [home] });
  // Today 6 PM through day 13 (day 14's 6 PM falls past the two-week window).
  assert.equal(plan.length, 14);
  assert.equal(plan[0].at, ms(6, 18));
  assert.equal(plan[0].day, TODAY);
  assert.equal(plan[13].day, '2026-10-19');
  assert.equal(plan[0].body, 'Every day · Home');

  const gym = task('gym', { scheduledOn: '2026-10-08', remindAt: at(8, 7), rrule: 'FREQ=WEEKLY;BYDAY=MO,TH' });
  assert.deepEqual(
    planReminders([gym], NOW).map((r) => r.day),
    ['2026-10-08', '2026-10-12', '2026-10-15', '2026-10-19'],
  );
});

test('plan steps say which step of which plan', () => {
  const plan = planReminders(
    [
      task('paper', { title: 'History paper', listId: 'home' }),
      task('s1', { parentId: 'paper', sortOrder: 1, status: 'completed', completedAt: at(5, 9) }),
      task('s2', { parentId: 'paper', sortOrder: 2, title: 'Gather sources', scheduledOn: TODAY, remindAt: at(6, 16) }),
    ],
    NOW,
    { lists: [home] },
  );
  assert.deepEqual(plan.map((r) => r.body), ['History paper · step 2 of 2 · Home']);
});

test('never more than the cap, soonest first', () => {
  const tasks = ['a', 'b', 'c', 'd', 'e'].map((id, i) =>
    task(id, { scheduledOn: TODAY, remindAt: at(6, 13 + i), rrule: 'FREQ=DAILY' }),
  );
  const plan = planReminders(tasks, NOW);
  assert.equal(plan.length, MAX_PENDING);
  assert.ok(plan.every((r, i) => i === 0 || plan[i - 1].at <= r.at));
  assert.equal(plan.at(-1)!.day, '2026-10-18', 'the furthest-out ones are left for later');
  assert.equal(planReminders(tasks, NOW, { limit: 3 }).length, 3);
});

test('the morning list counts the day and names the first thing to start', () => {
  const early = new Date(2026, 9, 6, 7, 0);
  const tasks = [
    task('paper', { title: 'History paper', dueOn: '2026-10-09' }),
    task('s1', { parentId: 'paper', sortOrder: 1, title: 'Gather 4-5 sources', scheduledOn: TODAY }),
    task('walk', { scheduledOn: TODAY, remindAt: at(6, 18), rrule: 'FREQ=WEEKLY;BYDAY=TU' }),
    task('stamps', { title: 'Buy stamps', scheduledOn: '2026-10-05' }),
    task('done', { scheduledOn: TODAY, status: 'completed', completedAt: at(6, 6) }),
  ];
  const plan = planReminders(tasks, early, { morning: { on: true, hour: 8, minute: 0 } });
  const mornings = plan.filter((r) => r.kind === 'morning');
  assert.deepEqual(mornings[0], {
    id: 'morning:2026-10-06',
    kind: 'morning',
    taskId: null,
    at: ms(6, 8),
    day: TODAY,
    title: 'Three things today',
    body: 'Start with “Gather 4-5 sources”.',
  });
  // Projected like Today: anything not done by then (even Tuesday's walk) rolls forward.
  assert.equal(mornings.length, 14);
  assert.equal(mornings[1].title, 'Three things today');
  assert.equal(
    planReminders(tasks.slice(0, 2), early, { morning: { on: true, hour: 8, minute: 0 } })[1].title,
    'One thing today',
  );

  assert.equal(
    planReminders(tasks, NOW, { morning: { on: true, hour: 8, minute: 0 } }).find((r) => r.kind === 'morning')?.id,
    'morning:2026-10-07',
    'past 8 AM: tomorrow first',
  );
  assert.equal(planReminders(tasks, early, { morning: { on: false, hour: 8, minute: 0 } }).filter((r) => r.kind === 'morning').length, 0);
  assert.equal(planReminders([], early, { morning: { on: true, hour: 8, minute: 0 } }).length, 0, 'nothing on: no ring');
});

test('reconciling: cancel what is gone, add what is new, replace changed words, keep open snoozes', () => {
  const call = task('call', { title: 'Call mom', scheduledOn: TODAY, remindAt: at(6, 17) });
  const walk = task('walk', { title: 'Walk', scheduledOn: TODAY, remindAt: at(6, 18) });
  const essay = task('essay', { title: 'Essay', status: 'completed', completedAt: at(6, 11) });
  const pending = [
    { id: `task:call:${ms(6, 17)}`, title: 'Call mom', body: '' },
    { id: `task:walk:${ms(6, 18)}`, title: 'Walk the dog', body: '' },
    { id: `task:call:${ms(6, 16)}`, title: 'Call mom', body: '' },
    { id: `snooze:walk:${ms(6, 12, 5)}`, title: 'Walk', body: '' },
    { id: `snooze:essay:${ms(6, 12, 5)}`, title: 'Essay', body: '' },
    { id: 'timer-end:abc', title: 'Time is up', body: '' },
  ];
  const changes = reminderChanges(pending, [call, walk, essay], NOW);
  assert.deepEqual(changes.cancel, [`task:call:${ms(6, 16)}`, `snooze:essay:${ms(6, 12, 5)}`]);
  assert.deepEqual(changes.add.map((r) => [r.id, r.title]), [[`task:walk:${ms(6, 18)}`, 'Walk']]);

  const walked = reminderChanges(pending, [call, { ...walk, status: 'completed', completedAt: at(6, 12) }, essay], NOW);
  assert.deepEqual(walked, {
    cancel: [`task:walk:${ms(6, 18)}`, `task:call:${ms(6, 16)}`, `snooze:walk:${ms(6, 12, 5)}`, `snooze:essay:${ms(6, 12, 5)}`],
    add: [],
  });
});

test('reconciling counts snoozes and other alerts toward the cap', () => {
  const tasks = ['a', 'b', 'c', 'd', 'e'].map((id, i) => task(id, { scheduledOn: TODAY, remindAt: at(6, 13 + i), rrule: 'FREQ=DAILY' }));
  const pending = [
    { id: `snooze:a:${ms(6, 12, 5)}`, title: 'a', body: 'Every day' },
    { id: 'timer-end:x', title: 'Time is up', body: '' },
  ];
  assert.equal(reminderChanges(pending, tasks, NOW).add.length, MAX_PENDING - 2);
});

test('snooze rings again in 10 minutes with the same words', () => {
  const r = snoozeOf({ taskId: 'walk', day: TODAY, title: 'Walk', body: 'Every day' }, NOW);
  assert.equal(r.at, ms(6, 12, 10));
  assert.equal(r.id, `snooze:walk:${ms(6, 12, 10)}`);
  assert.deepEqual(parseReminderId(r.id), { kind: 'snooze', taskId: 'walk' });
  assert.deepEqual(parseReminderId('morning:2026-10-06'), { kind: 'morning', taskId: null });
  assert.equal(parseReminderId('timer-end:abc'), null);
});

test('checking off: a one-off finishes, a repeat moves on with its time', () => {
  assert.deepEqual(checkOff(task('x'), TODAY, NOW), {
    patch: { status: 'completed', completedAt: NOW.toISOString() },
    movedTo: null,
  });
  const walk = task('walk', { scheduledOn: '2026-10-03', remindAt: at(3, 18), rrule: 'FREQ=DAILY' });
  assert.deepEqual(checkOff(walk, TODAY, NOW), {
    patch: { scheduledOn: '2026-10-07', remindAt: at(7, 18) },
    movedTo: '2026-10-07',
  });
  const ahead = task('ahead', { scheduledOn: '2026-10-08', rrule: 'FREQ=WEEKLY;BYDAY=TH' });
  assert.deepEqual(checkOff(ahead, TODAY, NOW).movedTo, '2026-10-15', 'checked off early: the next one after it');
});
