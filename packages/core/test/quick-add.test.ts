import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseQuickAdd, parseWhen } from '../src/quick-add.ts';

// Saturday 3 October 2026, 10:00 local time.
const SAT_10AM = new Date(2026, 9, 3, 10, 0);
const MON_10AM = new Date(2026, 9, 5, 10, 0);

const parse = (text: string, now = SAT_10AM) => parseQuickAdd(text, now);

test('repeats with a time', () => {
  assert.deepEqual(parse('Walk Biscuit every day 6pm'), {
    title: 'Walk Biscuit',
    scheduledOn: '2026-10-03',
    dueOn: null,
    time: { hour: 18, minute: 0 },
    rrule: 'FREQ=DAILY',
    matches: [{ kind: 'repeat', text: 'every day' }, { kind: 'time', text: '6pm' }],
  });
});

test('a daily time that already passed starts tomorrow', () => {
  assert.equal(parse('Walk Biscuit every day 6pm', new Date(2026, 9, 3, 20, 0)).scheduledOn, '2026-10-04');
});

test('repeat variants', () => {
  assert.deepEqual(
    [parse('Gym every mon and wed'), parse('Stand-up every weekday 9am'), parse('Water plants every other week'), parse('Take vitamins daily')]
      .map((r) => [r.title, r.rrule, r.scheduledOn]),
    [
      ['Gym', 'FREQ=WEEKLY;BYDAY=MO,WE', '2026-10-05'],
      ['Stand-up', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-10-05'],
      ['Water plants', 'FREQ=WEEKLY;INTERVAL=2', '2026-10-03'],
      ['Take vitamins', 'FREQ=DAILY', '2026-10-03'],
    ],
  );
  assert.deepEqual(parse('Journal every evening').time, { hour: 19, minute: 0 });
});

test('due dates', () => {
  const essay = parse('Submit essay by fri');
  assert.deepEqual([essay.title, essay.dueOn, essay.scheduledOn], ['Submit essay', '2026-10-09', null]);
  const lab = parse('Chem lab report due oct 12');
  assert.deepEqual([lab.title, lab.dueOn], ['Chem lab report', '2026-10-12']);
  const timed = parse('Essay due fri 5pm');
  assert.deepEqual([timed.title, timed.dueOn, timed.scheduledOn, timed.time], ['Essay', '2026-10-09', null, { hour: 17, minute: 0 }]);
});

test('dates and times', () => {
  const cases: [string, string, string | null, { hour: number; minute: number } | null][] = [
    ['Call mom tomorrow at 5', 'Call mom', '2026-10-04', { hour: 17, minute: 0 }],
    ['Review notes tomorrow morning', 'Review notes', '2026-10-04', { hour: 9, minute: 0 }],
    ['Movie tonight', 'Movie', '2026-10-03', { hour: 20, minute: 0 }],
    ['Call at 3:30', 'Call', '2026-10-03', { hour: 15, minute: 30 }],
    ['Dentist 10/14 3:30pm', 'Dentist', '2026-10-14', { hour: 15, minute: 30 }],
    ['Pay bills in 3 days', 'Pay bills', '2026-10-06', null],
    ['SAT practice test fri', 'SAT practice test', '2026-10-09', null],
    ['Return books on sat', 'Return books', '2026-10-03', null],
    ['Book flights march 2', 'Book flights', '2027-03-02', null],
    ['Lunch at noon', 'Lunch', '2026-10-03', { hour: 12, minute: 0 }],
  ];
  for (const [text, title, scheduledOn, time] of cases) {
    const r = parse(text);
    assert.deepEqual([r.title, r.scheduledOn, r.time], [title, scheduledOn, time], text);
  }
});

test('"next fri" means the following week', () => {
  assert.equal(parse('Pay rent fri', MON_10AM).scheduledOn, '2026-10-09');
  assert.equal(parse('Pay rent next fri', MON_10AM).scheduledOn, '2026-10-16');
});

test('ordinary titles are left alone', () => {
  for (const text of [
    'Call Tom',
    'Study for May exam',
    'Buy sunscreen',
    'Write weekly report',
    'Read 6 pages',
    'Problem set 2a',
    'SAT practice',
    'Morning run',
    'Sun salutations',
  ]) {
    const r = parse(text);
    assert.deepEqual([r.title, r.scheduledOn, r.dueOn, r.time, r.rrule, r.matches], [text, null, null, null, null, []], text);
  }
});

test('nothing left for a title keeps the text as the title', () => {
  assert.deepEqual(parse('tomorrow 6pm'), { title: 'tomorrow 6pm', scheduledOn: null, dueOn: null, time: null, rrule: null, matches: [] });
});

test('parseWhen understands a schedule on its own', () => {
  const now = new Date(2026, 9, 6, 9, 0); // Tue 6 Oct, 9am
  const when = (s: string) => {
    const p = parseWhen(s, now);
    return [p.scheduledOn, p.dueOn, p.time && `${p.time.hour}:${p.time.minute}`, p.rrule];
  };
  assert.deepEqual(when('fri 6pm'), ['2026-10-09', null, '18:0', null]);
  assert.deepEqual(when('tomorrow evening'), ['2026-10-07', null, '19:0', null]);
  assert.deepEqual(when('every weekday 7am'), ['2026-10-07', null, '7:0', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'], '7am has passed today');
  assert.deepEqual(when('oct 20'), ['2026-10-20', null, null, null]);
  assert.deepEqual(when('sat'), ['2026-10-10', null, null, null]);
  assert.deepEqual(when('gibberish'), [null, null, null, null]);
});

test('a preset day (Upcoming’s “+”) fills in when the text names no date', () => {
  const onThu = (text: string) => parseQuickAdd(text, SAT_10AM, { day: '2026-10-08' });
  assert.deepEqual([onThu('Buy stamps').title, onThu('Buy stamps').scheduledOn], ['Buy stamps', '2026-10-08']);
  assert.deepEqual([onThu('call mom 5pm').scheduledOn, onThu('call mom 5pm').time], ['2026-10-08', { hour: 17, minute: 0 }], 'a time alone lands on that day');
  assert.equal(onThu('call mom 9am').scheduledOn, '2026-10-08', 'even when that time has passed today');
  assert.deepEqual([onThu('Gym every mon').scheduledOn, onThu('Gym every mon').rrule], ['2026-10-12', 'FREQ=WEEKLY;BYDAY=MO'], 'a repeat starts from that day');
  assert.equal(onThu('Walk every day').scheduledOn, '2026-10-08');
  assert.equal(onThu('dentist tomorrow').scheduledOn, '2026-10-04', 'a typed date wins');
  assert.deepEqual([onThu('essay due fri').scheduledOn, onThu('essay due fri').dueOn], [null, '2026-10-09'], 'so does a typed deadline');
  assert.equal(onThu('tomorrow').scheduledOn, '2026-10-08', 'all-schedule text is the title, on that day');
});
