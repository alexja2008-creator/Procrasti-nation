import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clockOf, logicalDateString } from '../src/dates.ts';
import { parseQuickAdd, parseWhen, scheduleOf, withPicks } from '../src/quick-add.ts';
import { fillStart } from '../src/when.ts';

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

test('monthly repeats as people say them, starting on their first day (Alex’s plan, 2026-10-20)', () => {
  const cases: [string, string, string, string][] = [
    ['pay rent every month on the 1st', 'pay rent', 'FREQ=MONTHLY;BYMONTHDAY=1', '2026-11-01'],
    ['pay rent on the 1st of every month', 'pay rent', 'FREQ=MONTHLY;BYMONTHDAY=1', '2026-11-01'],
    ['pay rent every 1st', 'pay rent', 'FREQ=MONTHLY;BYMONTHDAY=1', '2026-11-01'],
    ['pay rent the 1st of each month', 'pay rent', 'FREQ=MONTHLY;BYMONTHDAY=1', '2026-11-01'],
    ['review budget monthly on the 15th', 'review budget', 'FREQ=MONTHLY;BYMONTHDAY=15', '2026-10-15'],
    ['paycheck every 1st and 15th', 'paycheck', 'FREQ=MONTHLY;BYMONTHDAY=1,15', '2026-10-15'],
    ['submit timesheet last day of every month', 'submit timesheet', 'FREQ=MONTHLY;BYMONTHDAY=-1', '2026-10-31'],
    ['submit timesheet every month on the last day', 'submit timesheet', 'FREQ=MONTHLY;BYMONTHDAY=-1', '2026-10-31'],
    ['submit timesheet every last day of the month', 'submit timesheet', 'FREQ=MONTHLY;BYMONTHDAY=-1', '2026-10-31'],
    ['every last friday book club', 'book club', 'FREQ=MONTHLY;BYDAY=-1FR', '2026-10-30'],
    ['club meeting every 3rd tue', 'club meeting', 'FREQ=MONTHLY;BYDAY=3TU', '2026-10-20'],
    ['staff meeting the first monday of every month', 'staff meeting', 'FREQ=MONTHLY;BYDAY=1MO', '2026-11-02'],
    ['water the cactus every other month on the 15th', 'water the cactus', 'FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15', '2026-10-15'],
    ['rent monthly', 'rent', 'FREQ=MONTHLY;BYMONTHDAY=15', '2026-10-15'],
  ];
  for (const [text, title, rrule, start] of cases) {
    const r = parse(text, THU_10AM);
    assert.deepEqual([r.title, r.rrule, r.scheduledOn], [title, rrule, start], text);
  }
  // "the first" beside "month", and "due the 1st every month".
  for (const text of ['pay rent on the first of every month', 'pay rent every month on the first', 'pay rent on the first day of every month', 'pay rent due the 1st every month']) {
    const r = parse(text, THU_10AM);
    assert.deepEqual([r.title, r.rrule, r.scheduledOn, r.dueOn], ['pay rent', 'FREQ=MONTHLY;BYMONTHDAY=1', '2026-11-01', null], text);
  }
  // Every other month starts on the coming 1st, then counts from there.
  const tue = new Date(2026, 9, 20, 10, 0);
  for (const text of ['water the cactus every other month on the 1st', 'water the cactus on the 1st of every other month']) {
    assert.deepEqual([parse(text, tue).rrule, parse(text, tue).scheduledOn], ['FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=1', '2026-11-01'], text);
  }
  // Typed at 10 AM on 31 January with 9 AM gone: the first turn is 28 February, but the repeat stays on the 31st.
  const late = parse('pay rent every month 9am', new Date(2027, 0, 31, 10, 0));
  assert.deepEqual([late.rrule, late.scheduledOn], ['FREQ=MONTHLY;BYMONTHDAY=31', '2027-02-28']);
  // Just before midnight on the 31st, "every 1st" starts tomorrow.
  assert.equal(parse('pay rent every 1st', new Date(2026, 9, 31, 23, 59)).scheduledOn, '2026-11-01');
  // The Start sheet's typed "every month" stays plain, so retyping it keeps the repeat's own day.
  assert.equal(parseWhen('every month 9am', THU_10AM).rrule, 'FREQ=MONTHLY');
  const rent = parse('pay rent every 1st 9am', THU_10AM);
  assert.deepEqual([rent.rrule, rent.time], ['FREQ=MONTHLY;BYMONTHDAY=1', { hour: 9, minute: 0 }]);
  assert.equal(parseQuickAdd('pay rent every 1st', THU_10AM, { repeats: 'cued' }).rrule, 'FREQ=MONTHLY;BYMONTHDAY=1', 'a checklist line too');
});

test('a day of the month after on, due or by is the next one', () => {
  assert.deepEqual([parse('lab report due the 28th', THU_10AM).title, parse('lab report due the 28th', THU_10AM).dueOn], ['lab report', '2026-10-28']);
  assert.equal(parse('dentist on the 28th at 3pm', THU_10AM).scheduledOn, '2026-10-28');
  assert.equal(parse('call the bank on the 3rd', THU_10AM).scheduledOn, '2026-11-03', 'gone this month: next month');
  assert.equal(parse('party on the 31st', new Date(2026, 10, 2, 10, 0)).scheduledOn, '2026-12-31', 'November has no 31st');
  assert.equal(parse('essay due on the 28th of October', THU_10AM).dueOn, '2026-10-28');
});

test('ordinals and "last" that aren’t schedules stay titles', () => {
  for (const text of [
    'Read the 3rd chapter',
    'Finish the 2nd draft',
    'Meet on the 3rd floor',
    'Win on the 1st try',
    'Review every 1st draft',
    'Check every 2nd answer',
    'Each 2nd grader needs a form',
    'Every 3rd period quiz',
    'Grade every 4th problem',
    'Enjoy every last day of summer',
    'Every last minute counts',
    'Essay on the 1st amendment',
    'Study the 2nd law of thermodynamics',
    'Watch the 3rd episode',
    'Pack for the last day of camp',
    'Last day of school party',
    'Every last one of them',
    'Every 1st-gen student form',
    'Turn in the 2nd essay',
    'Plan each 4th grade lesson',
    'Monthly report draft',
    'Monthly budget review notes',
    'Print the 1st and 2nd pages',
    'Every second counts',
    'Read every last page',
    'Sit on the 2nd row',
    'Every first time is hard',
    'The 3rd wheel',
    'Chapter 1st half summary',
    'Notes on the 2nd and 3rd chapters',
    'Quiz on the 1st and 2nd laws',
    'Essay on the 19th and 20th amendments',
    'Report on the 1st, 2nd and 3rd amendments',
  ]) {
    const r = parse(text, THU_10AM);
    assert.deepEqual([r.title, r.scheduledOn, r.dueOn, r.rrule], [text, null, null, null], text);
  }
});

test('the capture sheet’s rows: a picked start or deadline, unless the text names its own', () => {
  const sat = '2026-10-03';
  const pick = (text: string, picks: Parameters<typeof withPicks>[1]) => withPicks(parse(text), picks, sat);
  assert.deepEqual([pick('Buy stamps', { start: '2026-10-05' }).scheduledOn, pick('Buy stamps', {}).scheduledOn], ['2026-10-05', null]);
  assert.equal(pick('Buy stamps', { start: null }).scheduledOn, null, 'Later');
  assert.equal(pick('Dentist tomorrow', { start: '2026-10-10' }).scheduledOn, '2026-10-04', 'a typed day wins');
  assert.equal(pick('Essay due fri', { due: '2026-10-05' }).dueOn, '2026-10-09', 'so does a typed deadline');
  assert.equal(pick('Gym every mon', { due: '2026-10-04' }).dueOn, null, 'a repeat has no deadline');
  // Start Mon, due Fri: both kept.
  const both = pick('Lab report', { start: '2026-10-05', due: '2026-10-09' });
  assert.deepEqual([both.scheduledOn, both.dueOn, both.startFilled], ['2026-10-05', '2026-10-09', false]);
});

test('a deadline with no start gets one filled in, unless Later was picked', () => {
  const sat = '2026-10-03';
  const pick = (text: string, picks: Parameters<typeof withPicks>[1]) => withPicks(parse(text), picks, sat);
  const reading = pick('Read chapter 4 due fri', {});
  assert.deepEqual([reading.scheduledOn, reading.dueOn, reading.startFilled], ['2026-10-08', '2026-10-09', true], 'the day before');
  assert.equal(pick('Essay due fri', {}).scheduledOn, sat, 'big work starts today');
  assert.equal(pick('Buy stamps', { due: '2026-10-04' }).scheduledOn, sat, 'due tomorrow starts today');
  const later = pick('Read chapter 4 due fri', { start: null });
  assert.deepEqual([later.scheduledOn, later.startFilled], [null, false]);
});

test('a time goes with the deadline it was said with, or with the picked start', () => {
  const sat = '2026-10-03';
  const dentist = withPicks(parse('Dentist 3pm'), { due: '2026-10-05' }, sat);
  assert.deepEqual([dentist.scheduledOn, dentist.dueOn], ['2026-10-04', '2026-10-05'], 'alone, it goes with the picked deadline');
  assert.deepEqual([scheduleOf(dentist).remindAt, clockOf(scheduleOf(dentist).dueAt!)], [null, { hour: 15, minute: 0 }]);
  const started = scheduleOf(withPicks(parse('Dentist 3pm'), { start: '2026-10-05', due: '2026-10-09' }, sat));
  assert.deepEqual([started.dueAt, clockOf(started.remindAt!)], [null, { hour: 15, minute: 0 }]);
  const essay = scheduleOf(withPicks(parse('Essay due fri 5pm'), { start: '2026-10-05' }, sat));
  assert.deepEqual([essay.scheduledOn, essay.remindAt, clockOf(essay.dueAt!)], ['2026-10-05', null, { hour: 17, minute: 0 }]);
  const nowhere = withPicks(parse('Dentist 3pm'), { start: null }, sat);
  assert.deepEqual([scheduleOf(nowhere).remindAt, nowhere.time], [null, null], 'Later with no deadline has no day for a time');
});

test('"this evening" with a deadline starts today, and rings tonight', () => {
  const tonight = withPicks(parse('Read ch 4 this evening due fri'), {}, '2026-10-03');
  assert.deepEqual([tonight.scheduledOn, tonight.dueOn, tonight.startFilled], ['2026-10-03', '2026-10-09', false]);
  const fields = scheduleOf(tonight);
  assert.deepEqual([clockOf(fields.remindAt!), fields.dueAt], [{ hour: 19, minute: 0 }, null]);
  assert.equal(withPicks(parse('Essay every mon due fri'), {}, '2026-10-03').dueOn, '2026-10-09', 'a typed deadline on a repeat stays');
});

test('the filled-in start follows the person’s day, around midnight and daylight saving', () => {
  // 1:30 AM Friday with the day ending at 3 AM is still Thursday: due Friday starts today.
  const thu = logicalDateString(new Date(2026, 9, 9, 1, 30), 3);
  assert.equal(fillStart('2026-10-09', thu, 'Read chapter 4'), '2026-10-08');
  assert.equal(fillStart('2026-10-09', '2026-10-09', 'Read chapter 4'), '2026-10-09', 'never before today');
  // Due Monday 2 November: the day before is Sunday, when the clocks go back.
  assert.equal(fillStart('2026-11-02', '2026-10-28', 'Read chapter 4'), '2026-11-01');
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
