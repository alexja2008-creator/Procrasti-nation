// Quick add's repeats: "every day", "each sunday", "every M/W/Sat", and two or
// more days said on their own ("gym tue/thu", "walk the dog on Mondays,
// Wednesdays and Saturdays"; Alex, 2026-10-15). Narrow on purpose, like the rest
// of quick add: test/quick-add.test.ts lists titles that must stay titles.
// Also the text helpers quick-add.ts shares with it.

import { weeklyRule } from './when.ts';

export const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, weds: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6,
};
export const PART_OF_DAY: Record<string, number> = { morning: 9, afternoon: 15, evening: 19, night: 20, tonight: 20 };

export type Found = { start: number; end: number; groups: string[] };

/** Finds `pattern` in the working text, blanks it out (keeping offsets), and returns it. */
export function take(work: { text: string }, pattern: RegExp): Found | null {
  const m = pattern.exec(work.text);
  if (!m) return null;
  work.text = work.text.slice(0, m.index) + ' '.repeat(m[0].length) + work.text.slice(m.index + m[0].length);
  return { start: m.index, end: m.index + m[0].length, groups: m.slice(1) };
}

/** Blanks out `[start, end)` of the working text, keeping offsets. */
export const blank = (text: string, start: number, end: number, fill = ' ') =>
  text.slice(0, start) + fill.repeat(end - start) + text.slice(end);

const DAY_WORD = /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues?|weds?|thu(?:rs?)?|fri|sat)(s?)\b/i;
// Letter codes, only after every/each: one per day between separators ("M/W/F",
// "T/Th"), or a run people actually write ("MWF", "TTh"), so "every sum", "each
// saw", "Work on MWF schedule" and "w/ mom" stay words. A lone T is Tuesday only
// beside Thursday ("T/Th"), so "every T/F question" stays a title.
const DAY_CODES = /^(?:mtwthf|mtwtf|mtwrf|mwf|tuth|tth|tr|mw|wf|mf|tu|th|sa|su|m|t|w|f)\b/i;
const CODE_DAYS: Record<string, number[]> = {
  mtwthf: [1, 2, 3, 4, 5], mtwtf: [1, 2, 3, 4, 5], mtwrf: [1, 2, 3, 4, 5], mwf: [1, 3, 5], tuth: [2, 4], tth: [2, 4], tr: [2, 4],
  mw: [1, 3], wf: [3, 5], mf: [1, 5], m: [1], t: [2], tu: [2], w: [3], th: [4], f: [5], sa: [6], su: [0],
};
const LIST_SEP = /^(?:\s*,\s*(?:and\s+)?|\s+and\s+|\s*[&+/]\s*)/i;
// A time straight after a repeat word ("daily 8am", "tuesdays at 6"), as strict as quick add's times.
const TIME_AHEAD = String.raw`(?:\s+(?:at\s+)?(?:(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)(?![\w])|(?:[01]?\d|2[0-3]):[0-5]\d\b|noon\b|midnight\b)|\s+at\s+(?:1[0-2]|0?[1-9])\b(?!\s*(?:%|\/|st|nd|rd|th)))`;

interface DayList {
  days: number[];
  end: number;
  /** "Mondays": a full day name said as a plural. */
  fullPlural: boolean;
  /** Two names with only a space between ("Mondays Wednesdays"). */
  spaced: boolean;
  /** Only letter codes ("M/W"). */
  codesOnly: boolean;
}

/**
 * Reads days from `from` on, each day once. `codes`: letter codes count (after every/each).
 * "SAT" in capitals is the exam, never a day ("Review each SAT section").
 */
function readDays(text: string, from: number, codes: boolean): DayList | null {
  const list: DayList = { days: [], end: from, fullPlural: false, spaced: false, codesOnly: true };
  let pos = from;
  let afterSeparator = true; // the start of the list counts as one
  let loneT = false;
  const add = (day: number) => list.days.includes(day) || list.days.push(day);
  for (;;) {
    const rest = text.slice(pos);
    const word = DAY_WORD.exec(rest);
    const letters = !word && codes && afterSeparator ? DAY_CODES.exec(rest) : null;
    if (word) {
      const name = word[1];
      if (name === 'SAT') break;
      add(DAY_INDEX[name.toLowerCase()]);
      if (word[2] && /day$/i.test(name)) list.fullPlural = true;
      list.codesOnly = false;
    } else if (letters) {
      const code = letters[0].toLowerCase();
      if (code === 't') loneT = true;
      CODE_DAYS[code].forEach(add);
    } else break;
    if (!afterSeparator) list.spaced = true;
    pos += (word ?? letters)![0].length;
    list.end = pos;
    const sep = LIST_SEP.exec(text.slice(pos)) ?? /^\s+/.exec(text.slice(pos));
    if (!sep) break;
    afterSeparator = sep[0].trim() !== '';
    pos += sep[0].length;
  }
  if (loneT && !list.days.includes(4)) return null;
  return list.days.length ? list : null;
}

/**
 * Finds a cue (a global pattern) followed by a list of days that `accept`s,
 * blanks both out and returns the rule. `after` and `before` are the text around them.
 */
function takeDays(
  work: { text: string },
  cue: RegExp,
  codes: boolean,
  accept: (list: DayList, after: string, before: string) => boolean,
  interval: (m: RegExpMatchArray) => number = () => 1,
): (Found & { rrule: string }) | null {
  // A list turned down as a whole ("due Mon, Wed and Fri") isn't read again from its middle.
  let skipTo = -1;
  for (const m of work.text.matchAll(cue)) {
    const start = m.index ?? 0;
    if (start < skipTo) continue;
    const list = readDays(work.text, start + m[0].length, codes);
    if (!list) continue;
    if (!accept(list, work.text.slice(list.end), work.text.slice(0, start))) {
      skipTo = list.end;
      continue;
    }
    const rrule = weeklyRule(list.days, interval(m));
    work.text = blank(work.text, start, list.end);
    return { start, end: list.end, groups: [], rrule };
  }
  return null;
}

/** One letter code alone ("every m") is too thin to read as a day. */
const enough = (l: DayList) => !(l.codesOnly && l.days.length === 1);

/** Days right after these words are a deadline or a range, not a repeat ("due on mon and wed", "between Monday and Wednesday"). */
const notDeadline = (before: string) => !/\b(?:due:?|by|before|until|till|between|from)(?:\s+on)?\s*$/i.test(before);

/**
 * Takes the first repeat out of the working text. `cuedOnly`: only repeats said
 * with every/each or "daily" (a note's checklist line, which has no chips to
 * show a misread, so "Sat and Sun brunch" stays a title there).
 */
export function takeRepeat(work: { text: string }, { cuedOnly = false } = {}): (Found & { rrule: string; partHour?: number }) | null {
  // "every 2 weeks on tue and thu", "every other week on mon", "each week on Mondays"
  let d = takeDays(work, /\b(?:every|each)\s+(?:(other|\d{1,2})\s+)?weeks?\s+on\s+/gi, true, enough, (m) =>
    !m[1] ? 1 : m[1].toLowerCase() === 'other' ? 2 : Math.max(1, Number(m[1])),
  );
  if (d) return d;

  let f = take(work, /\bevery\s+other\s+(day|week|month|year)\b/i);
  if (f) return { ...f, rrule: `FREQ=${freqOf(f.groups[0])};INTERVAL=2` };

  f = take(work, /\bevery\s+(\d{1,2})\s+(days|weeks|months|years)\b/i);
  if (f) {
    const n = Number(f.groups[0]);
    return { ...f, rrule: n > 1 ? `FREQ=${freqOf(f.groups[1])};INTERVAL=${n}` : `FREQ=${freqOf(f.groups[1])}` };
  }

  // "every mon, wed and sat", "each tuesday", "every other fri", "every M/W/F"
  d = takeDays(work, /\b(?:every|each)\s+(other\s+)?/gi, true, enough, (m) => (m[1] ? 2 : 1));
  if (d) return d;

  f = take(work, cuedOnly ? /\b(?:every|each)\s+(weekdays|weekends)\b/i : /\b(?:every|each|on)\s+(weekdays|weekends)\b/i);
  if (f) return { ...f, rrule: f.groups[0].toLowerCase() === 'weekdays' ? 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' : 'FREQ=WEEKLY;BYDAY=SA,SU' };

  f = take(work, /\b(?:every|each)\s+(day|weekday|weekend|week|month|year|morning|afternoon|evening|night)\b(?!['’]s)/i);
  if (f) {
    const unit = f.groups[0].toLowerCase();
    if (unit === 'weekday') return { ...f, rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' };
    if (unit === 'weekend') return { ...f, rrule: 'FREQ=WEEKLY;BYDAY=SA,SU' };
    if (unit in PART_OF_DAY) return { ...f, rrule: 'FREQ=DAILY', partHour: PART_OF_DAY[unit] };
    return { ...f, rrule: `FREQ=${freqOf(unit)}` };
  }

  if (!cuedOnly) {
    // Two or more days repeat without "every"; one day stays a one-off, except a plural ("on Mondays").
    d = takeDays(work, /\bon\s+/gi, false, (l, _after, before) => notDeadline(before) && (l.days.length > 1 || l.fullPlural));
    if (d) return d;

    // No cue at all: "walk the dog Mondays Wednesdays and Saturdays", "gym tue/thu".
    // Names joined by a space need a plural, so "Friday Saturday shifts" stays a title;
    // a single plural needs a time after it, so "Tuesdays with Morrie" does too.
    // "this sat and sun" is one weekend.
    const dayStart = new RegExp(`\\b(?=${DAY_WORD.source.slice(1)})`, 'gi');
    d = takeDays(work, dayStart, false, (l, after, before) =>
      notDeadline(before) &&
      !/\b(?:this|next|last)\s*$/i.test(before) &&
      (l.days.length > 1 ? l.fullPlural || !l.spaced : l.fullPlural && new RegExp(`^${TIME_AHEAD}`, 'i').test(after)),
    );
    if (d) return d;
  }

  // "daily"/"weekly"/… only as the last word or before a time, so "weekly report" stays a title.
  f = take(work, new RegExp(String.raw`\b(daily|weekly|monthly|yearly)(?=\s*$|${TIME_AHEAD})`, 'i'));
  if (f) return { ...f, rrule: `FREQ=${freqOf(f.groups[0])}` };
  return null;
}

function freqOf(unit: string): string {
  const u = unit.toLowerCase();
  if (u.startsWith('day') || u === 'daily') return 'DAILY';
  if (u.startsWith('week')) return 'WEEKLY';
  if (u.startsWith('month')) return 'MONTHLY';
  return 'YEARLY';
}
