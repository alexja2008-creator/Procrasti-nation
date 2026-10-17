import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Task } from '../src/types.ts';
import { buildUpcoming, upcomingCounts, type UpcomingEntry } from '../src/upcoming.ts';

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
