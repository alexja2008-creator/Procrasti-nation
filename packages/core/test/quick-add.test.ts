import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clockOf } from '../src/dates.ts';
import { parseQuickAdd, scheduleOf, withDue } from '../src/quick-add.ts';

// Saturday 3 October 2026, 10:00 local time.
const SAT_10AM = new Date(2026, 9, 3, 10, 0);
const MON_10AM = new Date(2026, 9, 5, 10, 0);

const parse = (text: string, now = SAT_10AM) => parseQuickAdd(text, now);

test('a daily time that already passed starts tomorrow', () => {
  assert.equal(parse('Walk Biscuit every day 6pm', new Date(2026, 9, 3, 20, 0)).scheduledOn, '2026-10-04');
});

// Thursday 15 October 2026, 10:00: the day family testers typed these.
const THU_10AM = new Date(2026, 9, 15, 10, 0);

test('two or more days repeat, with or without "every", from the first matching day', () => {
  const cases: [string, string, string, string][] = [
    ['walk the dog on Mondays Wednesdays and Saturdays', 'walk the dog', 'FREQ=WEEKLY;BYDAY=MO,WE,SA', '2026-10-17'],
    ['walk the dog Mondays, Wednesdays and Saturdays', 'walk the dog', 'FREQ=WEEKLY;BYDAY=MO,WE,SA', '2026-10-17'],
    ['walk the dog every M/W/Sat', 'walk the dog', 'FREQ=WEEKLY;BYDAY=MO,WE,SA', '2026-10-17'],
    ['walk the dog every Monday Wednesday and Saturday', 'walk the dog', 'FREQ=WEEKLY;BYDAY=MO,WE,SA', '2026-10-17'],
    ['walk the dog every mon, wed, and sat', 'walk the dog', 'FREQ=WEEKLY;BYDAY=MO,WE,SA', '2026-10-17'],
    ['walk the dog mon/wed/sat', 'walk the dog', 'FREQ=WEEKLY;BYDAY=MO,WE,SA', '2026-10-17'],
    ['gym tue/thu', 'gym', 'FREQ=WEEKLY;BYDAY=TU,TH', '2026-10-15'],
    ['gym on tuesdays', 'gym', 'FREQ=WEEKLY;BYDAY=TU', '2026-10-20'],
    ['gym every MWF', 'gym', 'FREQ=WEEKLY;BYDAY=MO,WE,FR', '2026-10-16'],
    ['gym every MON/WED/FRI', 'gym', 'FREQ=WEEKLY;BYDAY=MO,WE,FR', '2026-10-16'],
    ['gym each week on mon and wed', 'gym', 'FREQ=WEEKLY;BYDAY=MO,WE', '2026-10-19'],
    ['gym every week on Mondays', 'gym', 'FREQ=WEEKLY;BYDAY=MO', '2026-10-19'],
    ['lab every TTh', 'lab', 'FREQ=WEEKLY;BYDAY=TU,TH', '2026-10-15'],
    ['lab every T/Th', 'lab', 'FREQ=WEEKLY;BYDAY=TU,TH', '2026-10-15'],
    ['stand-up every MTWTF', 'stand-up', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-10-15'],
    ['call grandma each sunday', 'call grandma', 'FREQ=WEEKLY;BYDAY=SU', '2026-10-18'],
    ['yoga on weekends', 'yoga', 'FREQ=WEEKLY;BYDAY=SA,SU', '2026-10-17'],
    ['shifts every weekdays', 'shifts', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', '2026-10-15'],
  ];
  for (const [text, title, rrule, scheduledOn] of cases) {
    const r = parse(text, THU_10AM);
    assert.deepEqual([r.title, r.rrule, r.scheduledOn], [title, rrule, scheduledOn], text);
  }
});

test('one day stays a one-off, unless it is a plural with a time', () => {
  const once = parse('call mom monday', THU_10AM);
  assert.deepEqual([once.title, once.rrule, once.scheduledOn], ['call mom', null, '2026-10-19']);
  const gym = parse('gym tuesdays 6pm', THU_10AM);
  assert.deepEqual([gym.title, gym.rrule, gym.scheduledOn, gym.time], ['gym', 'FREQ=WEEKLY;BYDAY=TU', '2026-10-20', { hour: 18, minute: 0 }]);
  assert.equal(parse('gym tuesdays', THU_10AM).rrule, null, 'a plural alone could be a title ("Tuesdays with Morrie")');
});

test('lists of days that are not repeats', () => {
  assert.equal(parse('visit grandma this sat and sun', THU_10AM).rrule, null, 'one weekend');
  for (const text of [
    'Essay due mon and wed',
    'Essay due: mon and wed',
    'Essay due on mon and wed',
    'Reading due Mon, Wed and Fri',
    'Finish lab before Mon and Wed',
    'Finish reading between Monday and Wednesday',
    'Finish lab between Mon and Wed and Fri',
    'visit grandma this fri, sat and sun',
  ]) {
    assert.equal(parse(text, THU_10AM).rrule, null, `${text}: a deadline or a range`);
  }
  assert.equal(parse('pay rent monthly at 1st', THU_10AM).rrule, null, '"at 1st" is not a time');
  assert.equal(parse('Call grandma every sunday w/ mom', THU_10AM).title, 'Call grandma w/ mom', '"w/" is not Wednesday');
});

test('a note’s checklist line only repeats when it says every/each', () => {
  const line = (text: string) => parseQuickAdd(text, THU_10AM, { repeats: 'cued' }).rrule;
  for (const text of ['Sat and Sun brunch', 'Sleep in on weekends', 'Office hours Tues & Thurs', 'gym tue/thu']) assert.equal(line(text), null, text);
  assert.equal(line('gym every mon and wed'), 'FREQ=WEEKLY;BYDAY=MO,WE');
  assert.equal(line('take vitamins daily'), 'FREQ=DAILY');
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

// A fresh batch, written when repeats stopped needing "every" (2026-10-15):
// day names, letter codes and "every"/"each" that are just words.
test('titles with day names and every/each are left alone', () => {
  for (const text of [
    'Tuesdays with Morrie essay',
    'TGI Fridays shift',
    'SAT exam',
    'Review each SAT section',
    'Study for SAT and ACT',
    'SAT/ACT prep',
    'Sell SAT books',
    'Plan A/B test',
    'Read Fridays for Future article',
    'Write Mondays poem',
    'Buy Saturdays Market tickets',
    'Mondays are hard playlist',
    'Email the TA',
    'Thank each TA',
    'Call grandma w/ mom',
    'Turn on TV for debate',
    'Turn on Wi-Fi',
    'Work on MWF schedule',
    'Work on F1 report',
    'Comment on TTh lecture',
    'Go over TTh notes',
    'Meet Sam on campus',
    'Sat in on lecture',
    'Fix the sat nav',
    'Mon Petit Chou recipe',
    'Wed planner pages',
    'Thu Nguyen interview',
    'Sun and Moon poster',
    'Every Breath You Take cover',
    'Every Summer playlist',
    'Every Little Thing playlist',
    'Every other thing list',
    'Everyday carry list',
    'Each friend gets a card',
    'Swap each other’s essays',
    'Check every M&M color',
    'Check every sum',
    'Do each sum twice',
    'Sharpen every saw',
    'Review each TF tutorial',
    'Install each FW update',
    'Reply to every M&T email',
    'Answer every T/F question',
    'Weekly 1:1 notes',
    'Daily Show segment',
    'Mail the W-2 form',
    'Reply to M & T Bank',
    'Pay off the MTA card',
  ]) {
    const r = parse(text, THU_10AM);
    assert.deepEqual([r.title, r.scheduledOn, r.dueOn, r.time, r.rrule, r.matches], [text, null, null, null, null, []], text);
  }
});

test('the capture sheet’s day row makes it due that day, unless the text names its own', () => {
  const stamps = withDue(parse('Buy stamps'), '2026-10-04');
  assert.deepEqual([stamps.title, stamps.dueOn, stamps.scheduledOn], ['Buy stamps', '2026-10-04', null]);
  assert.equal(withDue(parse('Buy stamps'), null).dueOn, null);
  assert.equal(withDue(parse('Essay due fri'), '2026-10-04').dueOn, '2026-10-09', 'a typed deadline wins');
  assert.deepEqual([withDue(parse('Dentist tomorrow'), '2026-10-10').scheduledOn, withDue(parse('Dentist tomorrow'), '2026-10-10').dueOn], ['2026-10-04', null], 'so does a typed day');
  assert.equal(withDue(parse('Gym every mon'), '2026-10-04').dueOn, null, 'a repeat has no deadline');
  const dentist = withDue(parse('Dentist 3pm'), '2026-10-04');
  assert.deepEqual(
    [dentist.scheduledOn, dentist.dueOn, dentist.time],
    [null, '2026-10-04', { hour: 15, minute: 0 }],
    'a time alone goes with the picked deadline, as "due sun 3pm" would',
  );
  assert.deepEqual(clockOf(scheduleOf(dentist).dueAt!), { hour: 15, minute: 0 });
});

test('a parse’s schedule as task fields: the time goes with the scheduled day, else the deadline', () => {
  const walk = scheduleOf(parse('Walk Biscuit every day 6pm'));
  assert.deepEqual([walk.scheduledOn, walk.rrule, walk.dueAt], ['2026-10-03', 'FREQ=DAILY', null]);
  assert.deepEqual(clockOf(walk.remindAt!), { hour: 18, minute: 0 });
  const essay = scheduleOf(parse('Essay due fri 5pm'));
  assert.deepEqual([essay.scheduledOn, essay.remindAt, essay.dueOn], [null, null, '2026-10-09']);
  assert.deepEqual(clockOf(essay.dueAt!), { hour: 17, minute: 0 });
  assert.deepEqual(scheduleOf(parse('Buy stamps')), { scheduledOn: null, dueOn: null, remindAt: null, dueAt: null, rrule: null });
});
