// Quick add: turns "walk Biscuit every day 6pm" into a title plus a schedule,
// with no AI round trip and no network. The grammar is deliberately narrow so
// ordinary titles survive ("Call Tom", "Study for May exam", "Buy sunscreen"):
// short day names like "sat" only count with a cue ("on sat", "next sat") or
// at the very end, and bare numbers are never times. "#chem" files the task in
// a territory whose name matches; an unknown #word stays in the title.
// Repeats ("every M/W/Sat", "gym tue/thu") are read in quick-add-repeat.ts and
// start on their first matching day.

import { addDays, atLocalTime, localDateString, occurrenceOnOrAfter, parseLocalDate } from './dates.ts';
import { blank, DAY_INDEX, PART_OF_DAY, take, takeRepeat, type Found } from './quick-add-repeat.ts';
import { matchTerritory } from './territories.ts';
import type { List, LocalDate } from './types.ts';
import { fillStart } from './when.ts';

export type QuickAddMatchKind = 'date' | 'time' | 'repeat' | 'due' | 'territory';

export interface QuickAddResult {
  /** What's left once the schedule words are taken out. */
  title: string;
  /** The day it shows up in Today (first occurrence for repeats). */
  scheduledOn: LocalDate | null;
  /** Deadline from "by fri" / "due oct 12". */
  dueOn: LocalDate | null;
  /** Time of day; applies to `scheduledOn`, or to `dueOn` when there's no schedule or `dueTime` says so. */
  time: { hour: number; minute: number } | null;
  /** The time belongs to the deadline even with a start day ("due fri 5pm" with a start filled in). */
  dueTime?: boolean;
  rrule: string | null;
  /** The territory a #tag named, when `lists` were given. */
  listId: string | null;
  /** The understood pieces in reading order, for chips in the capture sheet. */
  matches: { kind: QuickAddMatchKind; text: string }[];
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4,
  jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};
const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };

const FULL_DAY = '(sunday|monday|tuesday|wednesday|thursday|friday|saturday)';
const SHORT_DAY = '(sun|mon|tues?|weds?|thu(?:rs?)?|fri|sat)';
const ANY_DAY = `(${FULL_DAY.slice(1, -1)}|${SHORT_DAY.slice(1, -1)})`;
const MONTH = `(${Object.keys(MONTH_INDEX).sort((a, b) => b.length - a.length).join('|')})`;
const ORD = '(?:st|nd|rd|th)?';

const nextWeekday = (today: string, day: number) => {
  const dow = parseLocalDate(today).getDay();
  return addDays(today, (day - dow + 7) % 7);
};

/** The weekday in the following Monday–Sunday week ("next fri"). */
const weekdayNextWeek = (today: string, day: number) => {
  const dow = parseLocalDate(today).getDay();
  const nextMonday = addDays(today, 7 - ((dow + 6) % 7));
  return addDays(nextMonday, (day + 6) % 7);
};

/** A month/day in the future (this year, or next year if it has passed). */
function futureDate(today: string, month: number, day: number): string | null {
  const year = parseLocalDate(today).getFullYear();
  for (const y of [year, year + 1]) {
    const d = new Date(y, month, day);
    if (d.getMonth() !== month) return null; // e.g. Feb 30
    const ymd = localDateString(d);
    if (ymd >= today) return ymd;
  }
  return null;
}

/** Date expressions, optionally after `prefix`. Returns the first match (by pattern priority). */
function takeDate(work: { text: string }, today: string, prefix: string): (Found & { date: string; partHour?: number }) | null {
  const p = prefix ? `(?:${prefix})\\s+` : '(?:on\\s+)?';
  const attempts: [RegExp, (g: string[]) => string | null, number?][] = [
    [new RegExp(`\\b${p}(today|tonight|tomorrow|tmrw|tmr)\\b`, 'i'), (g) =>
      g[0].toLowerCase().startsWith('to') && g[0].toLowerCase() !== 'tomorrow' ? today : addDays(today, 1)],
    [new RegExp(`\\b${p}in\\s+(\\d{1,2}|${Object.keys(NUMBER_WORDS).join('|')})\\s+(days?|weeks?)\\b`, 'i'), (g) => {
      const n = NUMBER_WORDS[g[0].toLowerCase()] ?? Number(g[0]);
      return addDays(today, g[1].toLowerCase().startsWith('week') ? 7 * n : n);
    }],
    [new RegExp(`\\b${p}next\\s+week\\b`, 'i'), () => weekdayNextWeek(today, 1)],
    [new RegExp(`\\b${p}(?:this|the|next)\\s+weekend\\b`, 'i'), () => nextWeekday(today, 6)],
    [new RegExp(`\\b${p}next\\s+${ANY_DAY}\\b`, 'i'), (g) => weekdayNextWeek(today, DAY_INDEX[g[0].toLowerCase()])],
    [new RegExp(`\\b${p}(?:this\\s+)?${FULL_DAY}\\b`, 'i'), (g) => nextWeekday(today, DAY_INDEX[g[0].toLowerCase()])],
    // Short names need a cue: an explicit prefix, "on"/"this", or being last / before a time.
    [new RegExp(`\\b(?:${prefix || 'on|this'})\\s+${SHORT_DAY}\\b`, 'i'), (g) => nextWeekday(today, DAY_INDEX[g[0].toLowerCase()])],
    ...(prefix ? [] : [[
      new RegExp(`\\b${SHORT_DAY}\\b(?=\\s*$|\\s+(?:at\\s+)?\\d|\\s+(?:morning|afternoon|evening|night|noon)\\b)`, 'i'),
      (g: string[]) => nextWeekday(today, DAY_INDEX[g[0].toLowerCase()]),
    ] as [RegExp, (g: string[]) => string | null]]),
    [new RegExp(`\\b${p}${MONTH}\\.?\\s+(\\d{1,2})${ORD}\\b`, 'i'), (g) => futureDate(today, MONTH_INDEX[g[0].toLowerCase()], Number(g[1]))],
    [new RegExp(`\\b${p}(\\d{1,2})${ORD}\\s+(?:of\\s+)?${MONTH}\\b`, 'i'), (g) => futureDate(today, MONTH_INDEX[g[1].toLowerCase()], Number(g[0]))],
    [new RegExp(`\\b${p}(\\d{1,2})\\/(\\d{1,2})\\b`, 'i'), (g) => futureDate(today, Number(g[0]) - 1, Number(g[1]))],
  ];

  for (const [pattern, resolve] of attempts) {
    const snapshot = work.text;
    const found = take(work, pattern);
    if (!found) continue;
    const date = resolve(found.groups);
    if (!date) {
      work.text = snapshot;
      continue;
    }
    const word = found.groups[0]?.toLowerCase();
    let partHour = word === 'tonight' ? PART_OF_DAY.tonight : undefined;
    // "tomorrow morning", "fri evening"
    const after = /^\s+(morning|afternoon|evening|night)\b/i.exec(work.text.slice(found.end));
    if (after) {
      partHour = PART_OF_DAY[after[1].toLowerCase()];
      const end = found.end + after[0].length;
      work.text = work.text.slice(0, found.end) + ' '.repeat(after[0].length) + work.text.slice(end);
      return { ...found, end, date, partHour };
    }
    return { ...found, date, partHour };
  }
  return null;
}

/** Hours said without am/pm: 7–11 are morning, 12 is noon, 1–6 are afternoon/evening, 13–23 as written. */
const guessHour = (n: number) => (n >= 13 || n === 0 ? n : n >= 7 && n <= 11 ? n : n === 12 ? 12 : n + 12);

function takeTime(work: { text: string }): (Found & { hour: number; minute: number }) | null {
  const withMeridiem = (f: Found, h: string, m: string | undefined, meridiem: string) => {
    const pm = meridiem.toLowerCase().startsWith('p');
    return { ...f, hour: (Number(h) % 12) + (pm ? 12 : 0), minute: Number(m ?? 0) };
  };
  const attempts: [RegExp, (f: Found) => (Found & { hour: number; minute: number }) | null][] = [
    // "6pm", "6:30 pm", "at 6 a.m."
    [/\b(?:at\s+)?(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)(?![\w])/i, (f) => withMeridiem(f, f.groups[0], f.groups[1], f.groups[2])],
    // A lone a/p needs "at" or a colon, so "Problem 2a" stays a title.
    [/\bat\s+(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a|p)(?![\w])/i, (f) => withMeridiem(f, f.groups[0], f.groups[1], f.groups[2])],
    [/\b(1[0-2]|0?[1-9]):([0-5]\d)\s*(a|p)(?![\w])/i, (f) => withMeridiem(f, f.groups[0], f.groups[1], f.groups[2])],
    [/\b(?:at\s+)?(noon|midday|midnight)\b/i, (f) => ({ ...f, hour: f.groups[0].toLowerCase() === 'midnight' ? 0 : 12, minute: 0 })],
    // "3:30", "18:45"
    [/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/, (f) => ({ ...f, hour: guessHour(Number(f.groups[0])), minute: Number(f.groups[1]) })],
    // "at 6"
    [/\bat\s+(1[0-2]|0?[1-9])\b(?!\s*(?:%|\/|st|nd|rd|th))/i, (f) => ({ ...f, hour: guessHour(Number(f.groups[0])), minute: 0 })],
  ];
  for (const [pattern, toTime] of attempts) {
    const f = take(work, pattern);
    if (f) return toTime(f);
  }
  return null;
}

type TagTarget = Pick<List, 'id' | 'name' | 'sortOrder'>;

/**
 * Parses quick-add text. `now` is the device's current local time.
 * `scheduleOnly`: the input is only schedule words (task detail's "type it"
 * field), so there's no title to protect and everything may be understood.
 * `day`: the day quick add was opened for (Upcoming's "+"), used when the
 * text names no date of its own; a typed date or deadline wins.
 * `lists`: the person's territories, so "#chem" can file the task.
 * `repeats: 'cued'`: only repeats said with every/each or "daily" (a note's
 * checklist line, where nothing shows a misread before it's saved).
 */
export function parseQuickAdd(
  input: string,
  now: Date = new Date(),
  {
    scheduleOnly = false,
    day,
    lists = [],
    repeats = 'all',
  }: { scheduleOnly?: boolean; day?: LocalDate; lists?: TagTarget[]; repeats?: 'all' | 'cued' } = {},
): QuickAddResult {
  const today = localDateString(now);
  const work = { text: input };
  const spans: { kind: QuickAddMatchKind; start: number; end: number }[] = [];

  // The first #tag naming a territory files the task. Other #words are hidden
  // from the date and time rules ("#fri" stays a word) and put back afterwards.
  let listId: string | null = null;
  const hidden: { start: number; end: number }[] = [];
  for (const m of input.matchAll(/(^|\s)(#[^\s#]+)/g)) {
    const start = (m.index ?? 0) + m[1].length;
    const end = start + m[2].length;
    const found: TagTarget | null = listId === null ? matchTerritory(m[2].slice(1), lists) : null;
    if (found) {
      listId = found.id;
      spans.push({ kind: 'territory', start, end });
      work.text = blank(work.text, start, end);
    } else {
      hidden.push({ start, end });
      work.text = blank(work.text, start, end, '\u0000');
    }
  }

  const repeat = takeRepeat(work, { cuedOnly: repeats === 'cued' });
  if (repeat) spans.push({ kind: 'repeat', start: repeat.start, end: repeat.end });

  const due = takeDate(work, today, 'by|due(?:\\s+on)?|due\\s+by');
  if (due) spans.push({ kind: 'due', start: due.start, end: due.end });

  const date = takeDate(work, today, '');
  if (date) spans.push({ kind: 'date', start: date.start, end: date.end });

  const time = takeTime(work);
  if (time) spans.push({ kind: 'time', start: time.start, end: time.end });

  let partHour = date?.partHour ?? due?.partHour ?? repeat?.partHour;
  // "this evening" names today, deadline or not.
  let thisPart = false;
  if (!time && partHour === undefined) {
    const f = take(work, /\bthis\s+(morning|afternoon|evening)\b/i);
    if (f) {
      thisPart = true;
      partHour = PART_OF_DAY[f.groups[0].toLowerCase()];
      spans.push({ kind: 'date', start: f.start, end: f.end });
    }
  }

  for (const h of hidden) work.text = work.text.slice(0, h.start) + input.slice(h.start, h.end) + work.text.slice(h.end);
  const title = work.text.replace(/\s+/g, ' ').replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, '');
  if (!title && !scheduleOnly) {
    return { title: input.trim(), scheduledOn: day ?? null, dueOn: null, time: null, rrule: null, listId: null, matches: [] };
  }

  const clock = time ? { hour: time.hour, minute: time.minute } : partHour !== undefined ? { hour: partHour, minute: 0 } : null;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const passed = clock ? clock.hour * 60 + clock.minute <= minutesNow : false;

  const preset = !date && !due && day ? day : null;
  let scheduledOn: string | null = date?.date ?? preset;
  const rrule = repeat?.rrule ?? null;
  if (rrule) {
    // A list of days starts on its first matching day: "every other tue" typed on
    // a Thursday starts next Tuesday, and every second week counts from there.
    const first = rrule.includes('BYDAY=') ? rrule.replace(/;INTERVAL=\d+/, '') : rrule;
    const anchor = scheduledOn ?? today;
    scheduledOn = occurrenceOnOrAfter(first, anchor, anchor);
    // A daily 6pm reminder added at 8pm starts tomorrow.
    if (!date && !preset && scheduledOn === today && passed) scheduledOn = occurrenceOnOrAfter(first, anchor, addDays(today, 1));
  } else if (!scheduledOn && clock && (!due || thisPart)) {
    scheduledOn = passed ? addDays(today, 1) : today;
  }

  spans.sort((a, b) => a.start - b.start);
  return {
    title,
    scheduledOn,
    dueOn: due?.date ?? null,
    time: clock,
    rrule,
    listId,
    matches: spans.map((s) => ({ kind: s.kind, text: input.slice(s.start, s.end).trim() })),
  };
}

/**
 * A parse's schedule as task fields: the time goes on the scheduled day
 * (`remindAt`), or on the due day when there's only a deadline (`dueAt`).
 */
export function scheduleOf(p: QuickAddResult): { scheduledOn: LocalDate | null; dueOn: LocalDate | null; remindAt: string | null; dueAt: string | null; rrule: string | null } {
  const { time, scheduledOn, dueOn } = p;
  const onDue = !!dueOn && (p.dueTime ?? !scheduledOn);
  return {
    scheduledOn,
    dueOn,
    remindAt: time && scheduledOn && !onDue ? atLocalTime(scheduledOn, time.hour, time.minute) : null,
    dueAt: time && dueOn && onDue ? atLocalTime(dueOn, time.hour, time.minute) : null,
    rrule: p.rrule,
  };
}

/** The text names its own start day or repeat ("fri", "every mon"; a time alone doesn't count). */
export const namesItsStart = (p: QuickAddResult) => p.matches.some((m) => m.kind === 'date' || m.kind === 'repeat');

/** The text names its own deadline ("due fri", "by fri"). */
export const namesItsDue = (p: QuickAddResult) => p.matches.some((m) => m.kind === 'due');

/** What the + sheet's rows picked. `start` is a day, null for Later, or undefined when nothing is picked. */
export interface DayPicks {
  start?: LocalDate | null;
  due?: LocalDate | null;
}

/**
 * The + sheet's Start and Due rows (Alex, 2026-10-20: the day you'll start leads,
 * the deadline is optional). Typed words win: a typed day or repeat keeps its
 * start, a typed deadline its due, and a repeat takes no picked deadline. A deadline with
 * no start gets one filled in (`fillStart`) unless Later was picked, and
 * `startFilled` says so, so Plan it can let the plan date its own steps. A time
 * said with the deadline ("due fri 5pm"), or typed alone with no start picked,
 * goes with the deadline ("dentist 3pm" due Sun is due Sun at 3).
 */
export function withPicks(p: QuickAddResult, picks: DayPicks, today: LocalDate): QuickAddResult & { startFilled: boolean } {
  const typedStart = namesItsStart(p);
  const typedDue = namesItsDue(p);
  const dueOn = typedDue ? p.dueOn : p.rrule ? null : (picks.due ?? null);
  const dueTime = !!p.time && !!dueOn && !typedStart && (typedDue || picks.start == null);

  let start = typedStart ? p.scheduledOn : picks.start !== undefined ? picks.start : dueTime ? null : p.scheduledOn;
  const startFilled = !start && picks.start !== null && !!dueOn;
  if (startFilled) start = fillStart(dueOn!, today, p.title);
  // A time with no day to go on (Later, no deadline) is dropped, so the chips show what's saved.
  const time = start || dueOn ? p.time : null;
  return { ...p, scheduledOn: start ?? null, dueOn, time, dueTime, startFilled };
}

/** "fri 6pm", "every weekday 7am", "oct 20": a schedule on its own, in quick add's grammar. */
export const parseWhen = (input: string, now: Date = new Date()) => parseQuickAdd(input, now, { scheduleOnly: true });
