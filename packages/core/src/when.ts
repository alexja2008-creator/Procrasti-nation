// Picking dates in task detail: one-tap day, time and repeat chips, a month
// grid, and the task patches they produce. Pure, so iOS, web and (later)
// Upcoming agree. Weeks start on Monday.

import { addDays, atLocalTime, clockOf, describeRRule, localDateString, monthlyWhich, occurrenceOnOrAfter, parseLocalDate, parseRRule, pinMonthDay } from './dates.ts';
import { suggestsPlan } from './plan-offer.ts';
import type { LocalDate, Task } from './types.ts';

export interface ClockTime {
  hour: number;
  minute: number;
}

export interface DayChip {
  id: 'today' | 'tomorrow';
  label: string;
  date: LocalDate;
}

/**
 * Today and Tomorrow; any other day is picked on the calendar or typed (Alex,
 * 2026-10-15: "This weekend" and "Next week" made it too easy to start a plan
 * on a day its later steps came before).
 */
export function dayChips(today: LocalDate): DayChip[] {
  return [
    { id: 'today', label: 'Today', date: today },
    { id: 'tomorrow', label: 'Tomorrow', date: addDays(today, 1) },
  ];
}

/** The same parts of the day quick add understands ("tomorrow evening"). */
export const timeChips: { id: 'morning' | 'afternoon' | 'evening'; label: string; time: ClockTime }[] = [
  { id: 'morning', label: 'Morning', time: { hour: 9, minute: 0 } },
  { id: 'afternoon', label: 'Afternoon', time: { hour: 15, minute: 0 } },
  { id: 'evening', label: 'Evening', time: { hour: 19, minute: 0 } },
];

/** Half-hour slots for "other time", 6:00 AM to 11:30 PM by default. */
export function timeSlots(fromHour = 6, toHour = 23, stepMinutes = 30): ClockTime[] {
  const slots: ClockTime[] = [];
  for (let m = fromHour * 60; m <= toHour * 60 + (60 - stepMinutes); m += stepMinutes) {
    slots.push({ hour: Math.floor(m / 60), minute: m % 60 });
  }
  return slots;
}

export const sameTime = (a: ClockTime | null, b: ClockTime | null) =>
  !!a && !!b && a.hour === b.hour && a.minute === b.minute;

// ---------------------------------------------------------------------------
// The web's time picker: an hour, then its quarter (the iPhone has a wheel).

/** A quarter's chip: ":00", ":15". */
export const quarterLabel = (minute: number) => `:${String(minute).padStart(2, '0')}`;

/** `a` is later in the day than `b`. */
export const laterThan = (a: ClockTime, b: ClockTime) => a.hour * 60 + a.minute > b.hour * 60 + b.minute;

/** An hour's quarters still open: all four, or those later than `after` (a Declaration's times already gone). */
export function quartersOf(hour: number, after: ClockTime | null = null): ClockTime[] {
  return [0, 15, 30, 45].map((minute) => ({ hour, minute })).filter((t) => !after || laterThan(t, after));
}

/** The hours offered, 6 AM to 11 PM, leaving out any with no quarter still open. */
export function pickerHours(after: ClockTime | null = null, from = 6, to = 23): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i).filter((h) => quartersOf(h, after).length > 0);
}

/** Picking an hour keeps the minutes when that time is still open, else takes the hour's first open quarter. */
export function pickHour(hour: number, current: ClockTime | null, after: ClockTime | null = null): ClockTime | null {
  const open = quartersOf(hour, after);
  return open.find((t) => current && t.minute === current.minute) ?? open[0] ?? null;
}

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** A weekly repeat's days (0 = Sunday) and interval; null for any other repeat. */
export function weeklyOf(rrule: string | null): { days: number[]; interval: number } | null {
  if (!rrule) return null;
  const { freq, interval, byDay } = parseRRule(rrule);
  return freq === 'WEEKLY' && byDay?.length ? { days: byDay, interval } : null;
}

/** Any weekly repeat's interval, with or without days ("every 2 weeks" is 2); null for any other repeat. */
export function weeklyInterval(rrule: string | null): number | null {
  if (!rrule) return null;
  const { freq, interval } = parseRRule(rrule);
  return freq === 'WEEKLY' ? interval : null;
}

/**
 * A weekly repeat on these days, Monday first, so the same days always make the
 * same rule (Mon–Fri is Every weekday), keeping an interval ("every 2 weeks").
 */
export function weeklyRule(days: number[], interval = 1): string {
  const byDay = [...new Set(days)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => RRULE_DAYS[d]);
  return `FREQ=WEEKLY${interval > 1 ? `;INTERVAL=${interval}` : ''};BYDAY=${byDay.join(',')}`;
}

/** Common one-tap repeats; "weekly" follows the task's day. Monthly ones are `monthlyChoices` (Every month…). */
export function repeatChips(anchor: LocalDate): { id: string; label: string; rrule: string }[] {
  const weekly = `FREQ=WEEKLY;BYDAY=${RRULE_DAYS[parseLocalDate(anchor).getDay()]}`;
  return [
    { id: 'daily', rrule: 'FREQ=DAILY' },
    { id: 'weekdays', rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
    { id: 'weekly', rrule: weekly },
  ].map((c) => ({ ...c, label: describeRRule(c.rrule) }));
}

/**
 * The Repeat sheet's Every month… choices, worked out from the task's day (Alex's
 * plan, D8): on its day of the month, on its weekday's place in the month (the
 * third Tuesday; the last Tuesday too when it's in the month's last week), on the
 * 1st and on the last day, with no two the same. The 31st is the last day (a day
 * past a month's end lands there), and "the fifth Tuesday" isn't offered.
 * `interval` keeps an every-other-month repeat's months.
 */
export function monthlyChoices(anchor: LocalDate, interval = 1): { id: string; label: string; rrule: string }[] {
  const d = parseLocalDate(anchor);
  const day = d.getDate();
  const weekday = RRULE_DAYS[d.getDay()];
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const nth = Math.ceil(day / 7);
  const parts = [
    day < 31 ? `BYMONTHDAY=${day}` : null,
    nth <= 4 ? `BYDAY=${nth}${weekday}` : null,
    day > lastDay - 7 ? `BYDAY=-1${weekday}` : null,
    'BYMONTHDAY=1',
    'BYMONTHDAY=-1',
  ];
  const rules = [...new Set(parts.filter((p): p is string => !!p))].map(
    (part) => `FREQ=MONTHLY${interval > 1 ? `;INTERVAL=${interval}` : ''};${part}`,
  );
  return rules.map((rrule) => ({ id: rrule, rrule, label: monthlyChoiceLabel(rrule) }));
}

/** "On the 20th", "On the third Tuesday", "On the last day". */
export function monthlyChoiceLabel(rrule: string): string {
  const which = monthlyWhich(rrule);
  return which ? `On ${which}` : describeRRule(rrule);
}

/** The monthly repeat a rule is, with an old plain "every month" read as its current day (`pinMonthDay`); null for any other repeat. */
export function monthlyOf(rrule: string | null, anchor: LocalDate): string | null {
  return rrule && parseRRule(rrule).freq === 'MONTHLY' ? pinMonthDay(rrule, anchor) : null;
}

// ---------------------------------------------------------------------------
// Month grid

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const monthLabel = (year: number, month: number) => `${MONTH_NAMES[month]} ${year}`;

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The week for picking a repeat's days, Monday first (0 = Sunday). */
export const pickerWeek = [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, short: WEEKDAY_NAMES[day].slice(0, 3), long: WEEKDAY_NAMES[day] }));

/** "Tuesday 6 October", for screen readers. */
export function longDateLabel(ymd: LocalDate): string {
  const d = parseLocalDate(ymd);
  return `${WEEKDAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/** The Monday-first week containing `day`. */
export function weekStrip(day: LocalDate): LocalDate[] {
  const monday = addDays(day, -((parseLocalDate(day).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export const shiftWeek = (day: LocalDate, delta: number) => addDays(day, 7 * delta);

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** The weeks of a month (0-based), Monday first; null pads the edges. */
export function monthGrid(year: number, month: number): (LocalDate | null)[][] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const cells: (LocalDate | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/**
 * The start day PN fills in for a deadline, since a deadline never sits without
 * one (Alex, 2026-10-20): the day before it's due; today when it's due today or
 * tomorrow, or when the task sounds big enough for a plan (big work goes better
 * started early). Never before today.
 */
export function fillStart(dueOn: LocalDate, today: LocalDate, title: string): LocalDate {
  const dayBefore = addDays(dueOn, -1);
  return dayBefore <= today || suggestsPlan(title) ? today : dayBefore;
}

// ---------------------------------------------------------------------------
// Patches. Start (once "When") is the day you'll start it (scheduledOn, with its
// time in remindAt); "Due" is the deadline (dueOn, with dueAt when it has a time).

export type Schedule = Pick<Task, 'scheduledOn' | 'remindAt' | 'dueOn' | 'dueAt' | 'rrule' | 'declaredAt'>;

/**
 * Clearing "When" also clears the repeat: a series needs a day to start from. Any new When
 * withdraws a Declaration (a new time takes a new signature: `declarePatch`).
 */
export function whenPatch(day: LocalDate | null, time: ClockTime | null): Partial<Schedule> {
  if (!day) return { scheduledOn: null, remindAt: null, rrule: null, declaredAt: null };
  return { scheduledOn: day, remindAt: time ? atLocalTime(day, time.hour, time.minute) : null, declaredAt: null };
}

export function duePatch(day: LocalDate | null, time: ClockTime | null): Partial<Schedule> {
  return { dueOn: day, dueAt: day && time ? atLocalTime(day, time.hour, time.minute) : null };
}

// A list of days, or a day of the month, starts on its first matching day: every second week or month counts from there.
const firstDayRule = (rrule: string) => (/BY(?:MONTH)?DAY=/.test(rrule) ? rrule.replace(/;INTERVAL=\d+/, '') : rrule);
const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d));

/**
 * Where changing a repeat's weekdays lands (Alex's plan, D10): the first new
 * day from today, or from tomorrow if the task already sat after today (today's
 * turn is done). An every-other-week repeat keeps its weeks. Null when it isn't
 * a change of weekdays.
 */
export function daysChangeLanding(task: Schedule, rrule: string, today: LocalDate): LocalDate | null {
  // "Every 2 weeks" with no days of its own falls on the task's weekday.
  const plain = weeklyInterval(task.rrule);
  const was = weeklyOf(task.rrule) ?? (plain && task.scheduledOn ? { days: [parseLocalDate(task.scheduledOn).getDay()], interval: plain } : null);
  const now = weeklyOf(rrule);
  if (!was || !now || sameDays(was.days, now.days)) return null;
  const from = task.scheduledOn && task.scheduledOn > today ? addDays(today, 1) : today;
  if (now.interval > 1 && now.interval === was.interval && task.scheduledOn) {
    // The task's day is in an "on" week: step back by whole intervals to count from there.
    let anchor = task.scheduledOn;
    while (anchor > from) anchor = addDays(anchor, -7 * now.interval);
    return occurrenceOnOrAfter(rrule, anchor, from);
  }
  return occurrenceOnOrAfter(firstDayRule(rrule), from, from);
}

/**
 * An every-other-month repeat whose day changes keeps its months: its turns
 * count from the task's own month (Oct, Dec, Feb), so "On the 1st" for a repeat
 * on 15 December lands on 1 February, not 1 January. Null otherwise.
 */
function monthsKeptLanding(task: Schedule, rrule: string, from: LocalDate): LocalDate | null {
  const was = task.rrule ? parseRRule(task.rrule) : null;
  const now = parseRRule(rrule);
  if (!task.scheduledOn || was?.freq !== 'MONTHLY' || now.freq !== 'MONTHLY' || now.interval < 2 || was.interval !== now.interval) return null;
  const day = parseLocalDate(task.scheduledOn);
  return occurrenceOnOrAfter(rrule, localDateString(new Date(day.getFullYear(), day.getMonth(), 1)), from);
}

/**
 * A repeat typed in the Start sheet that is the task's own: the same rule, or
 * "every month" for a monthly repeat whose day is already written in, so
 * retyping it to change its time keeps its day.
 */
export function sameRepeat(typed: string, current: string | null): boolean {
  if (!current) return false;
  if (typed === current) return true;
  const a = parseRRule(typed);
  const b = parseRRule(current);
  return a.freq === 'MONTHLY' && b.freq === 'MONTHLY' && !a.monthDays && !a.nth && a.interval === b.interval;
}

/**
 * Setting a repeat moves the task to the series' first day, keeping its time.
 * A change of weekdays lands by `daysChangeLanding`. Anything else starts on or
 * after the task's own day, or today if that's gone: "every weekday" on a
 * Saturday task moves it to Monday, "every month" on the 17th stays there.
 */
export function repeatPatch(task: Schedule, rrule: string | null, today: LocalDate): Partial<Schedule> {
  if (!rrule) return { rrule: null };
  // An old plain "every month" given its own day (the Repeat sheet's ticked choice) is the same
  // repeat: the day goes into the rule and the task stays put, carried over or not.
  if (task.rrule && task.scheduledOn && rrule === pinMonthDay(task.rrule, task.scheduledOn) && rrule !== task.rrule) return { rrule };
  const from = task.scheduledOn && task.scheduledOn > today ? task.scheduledOn : today;
  const first = daysChangeLanding(task, rrule, today) ?? monthsKeptLanding(task, rrule, from) ?? occurrenceOnOrAfter(firstDayRule(rrule), from, from);
  const time = task.remindAt ? clockOf(task.remindAt) : null;
  // A plain monthly repeat keeps the day it starts on, so it never slides from the 31st.
  return { rrule: pinMonthDay(rrule, first), ...whenPatch(first, time) };
}
