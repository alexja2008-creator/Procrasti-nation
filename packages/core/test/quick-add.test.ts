import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clockOf } from '../src/dates.ts';
import { parseQuickAdd, parseWhen, scheduleOf, withDue } from '../src/quick-add.ts';

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
    listId: null,
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

test('"every other" and "every 2 weeks on" days start on the first matching day', () => {
  const payroll = parse('payroll every other friday', THU_10AM);
  assert.deepEqual([payroll.title, payroll.rrule, payroll.scheduledOn], ['payroll', 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR', '2026-10-16']);
  const plants = parse('water plants every 2 weeks on tue and thu', THU_10AM);
  assert.deepEqual([plants.title, plants.rrule, plants.scheduledOn], ['water plants', 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH', '2026-10-15']);
});

test('a repeat with no days keeps its own rhythm from today', () => {
  const eightPm = new Date(2026, 9, 15, 20, 0);
  assert.equal(parse('team sync every 2 weeks 6pm', eightPm).scheduledOn, '2026-10-29', '6pm has passed, so the next one, two weeks on');
  assert.equal(parse('gym every 3 days 6pm', eightPm).scheduledOn, '2026-10-18');
});

test('"daily" before a time is a repeat at that time', () => {
  for (const text of ['take vitamins daily 8am', 'take vitamins daily at 8']) {
    const r = parse(text, THU_10AM);
    assert.deepEqual([r.title, r.rrule, r.scheduledOn, r.time], ['take vitamins', 'FREQ=DAILY', '2026-10-16', { hour: 8, minute: 0 }], text);
  }
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

test('nothing left for a title keeps the text as the title', () => {
  assert.deepEqual(parse('tomorrow 6pm'), { title: 'tomorrow 6pm', scheduledOn: null, dueOn: null, time: null, rrule: null, listId: null, matches: [] });
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

test('#tags file into a territory; unknown ones stay in the title, untouched by the date rules', () => {
  const lists = [
    { id: 'chem', name: 'Chem 201', sortOrder: 1 },
    { id: 'home', name: 'Home', sortOrder: 2 },
    { id: 'fridays', name: 'Friday club', sortOrder: 3 },
  ];
  const tagged = (text: string) => parseQuickAdd(text, SAT_10AM, { lists });
  const lab = tagged('Write lab report fri #chem');
  assert.deepEqual([lab.title, lab.listId, lab.scheduledOn], ['Write lab report', 'chem', '2026-10-09']);
  assert.deepEqual(lab.matches.map((m) => [m.kind, m.text]), [['date', 'fri'], ['territory', '#chem']]);
  assert.deepEqual([tagged('#home water plants').title, tagged('#home water plants').listId], ['water plants', 'home']);
  assert.deepEqual([tagged('Sell #textbooks tomorrow').title, tagged('Sell #textbooks tomorrow').listId], ['Sell #textbooks', null]);
  assert.deepEqual([tagged('Plan party #sat').title, tagged('Plan party #sat').scheduledOn], ['Plan party #sat', null], 'an unknown #sat is not a date');
  assert.equal(tagged('Lab #chem #home').listId, 'chem', 'the first territory wins');
  assert.equal(tagged('Lab #chem #home').title, 'Lab #home');
  assert.equal(tagged('Practice #fri').listId, 'fridays', 'a territory beats the date rules');
  assert.equal(tagged('Email#chem').listId, null, 'a tag starts a word');
  assert.equal(parseQuickAdd('Lab #chem', SAT_10AM).listId, null, 'no territories given: nothing to match');
  assert.equal(parseQuickAdd('Lab #chem', SAT_10AM).title, 'Lab #chem');
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
