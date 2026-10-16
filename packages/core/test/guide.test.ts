import assert from 'node:assert/strict';
import { test } from 'node:test';

import { guide, type GuideExample, type GuideFor } from '../src/nation.ts';
import { parseQuickAdd, scheduleOf } from '../src/quick-add.ts';

const PLACES: GuideFor[] = [
  { web: false, mac: false },
  { web: true, mac: true },
  { web: true, mac: false },
];

/** Every word the guide shows on one platform. */
function allText(p: GuideFor): string[] {
  const sections = guide.sections(p);
  return [
    guide.open,
    guide.title,
    guide.lead,
    guide.wordsLabel,
    ...guide.words.flatMap((w) => [w.term, w.meaning]),
    ...sections.flatMap((s) => [s.title, ...s.blocks.flatMap((b) => (typeof b === 'string' ? [b] : b.flatMap((e) => [e.typed, e.means])))]),
  ];
}

const examples = (p: GuideFor): GuideExample[] =>
  guide.sections(p).flatMap((s) => s.blocks.flatMap((b) => (typeof b === 'string' ? [] : [...b])));

test('the guide never sounds like a scolding', () => {
  for (const p of PLACES) {
    for (const line of allText(p)) {
      assert.doesNotMatch(line, /overdue|\blate\b|fail|lazy|behind|disappoint|should have/i, line);
    }
  }
});

test('every word family testers found confusing is in the word list', () => {
  const terms = guide.words.map((w) => w.term);
  for (const term of ['Customs', 'Territories', 'Task', 'Plan', 'Step', 'Note', 'Plan it', 'Start Mode', 'Declaration', 'Morning Briefing', 'Passport', 'Stamps']) {
    assert.ok(terms.includes(term), term);
  }
});

test('the AI button is always "Plan it"', () => {
  for (const p of PLACES) {
    for (const line of allText(p)) {
      for (const m of line.matchAll(/plan it/gi)) assert.equal(m[0], 'Plan it', line);
    }
  }
});

test('the iPhone never hears about right-clicks or keyboard shortcuts, and the web does', () => {
  const phone = allText({ web: false, mac: false }).join(' ');
  assert.doesNotMatch(phone, /right-click|click|⌘|Ctrl/i);
  const mac = allText({ web: true, mac: true }).join(' ');
  assert.match(mac, /Right-click/);
  assert.match(mac, /⌘K/);
  assert.doesNotMatch(mac, /Ctrl/);
  const pc = allText({ web: true, mac: false }).join(' ');
  assert.match(pc, /Ctrl\+K/);
  assert.doesNotMatch(pc, /⌘/);
});

test('every section has a title and something to read, and the titles differ', () => {
  const sections = guide.sections({ web: false, mac: false });
  assert.equal(new Set(sections.map((s) => s.title)).size, sections.length);
  for (const s of sections) {
    assert.ok(s.title.trim(), 'a title');
    assert.ok(s.blocks.length > 0, s.title);
  }
});

// The examples must do what the guide says they do. Friday 16 October 2026, 10 AM.
const NOW = new Date(2026, 9, 16, 10, 0);
const LISTS = [{ id: 'chem', name: 'Chem 201' }];
const clock = (iso: string | null) => (iso ? new Date(iso).toTimeString().slice(0, 5) : null);

test('typing each example does what the guide says', () => {
  const expected: Record<string, (s: ReturnType<typeof scheduleOf>, listId: string | null) => void> = {
    'Essay due fri': (s) => assert.equal(s.dueOn, '2026-10-16'),
    'Dentist tomorrow 3pm': (s) => {
      assert.equal(s.scheduledOn, '2026-10-17');
      assert.equal(clock(s.remindAt), '15:00');
    },
    'Gym every mon and wed 6pm': (s) => {
      assert.equal(s.rrule, 'FREQ=WEEKLY;BYDAY=MO,WE');
      assert.equal(clock(s.remindAt), '18:00');
    },
    'Lab report #chem': (_, listId) => assert.equal(listId, 'chem'),
    'Stretch every day 7am': (s) => {
      assert.equal(s.rrule, 'FREQ=DAILY');
      assert.equal(clock(s.remindAt), '07:00');
    },
    'Read every weekday': (s) => assert.equal(s.rrule, 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'),
    'Walk the dog every M/W/Sat': (s) => assert.equal(s.rrule, 'FREQ=WEEKLY;BYDAY=MO,WE,SA'),
  };
  const shown = examples({ web: false, mac: false });
  assert.deepEqual(shown.map((e) => e.typed).sort(), Object.keys(expected).sort(), 'each example has a check');
  for (const e of shown) {
    const p = parseQuickAdd(e.typed, NOW, { lists: LISTS });
    expected[e.typed](scheduleOf(p), p.listId);
  }
});
