// Picking dates in task detail: one-tap day, time and repeat chips, a month
// grid, and the task patches they produce. Pure, so iOS, web and (later)
// Upcoming agree. Weeks start on Monday.

import { addDays, atLocalTime, clockOf, describeRRule, occurrenceOnOrAfter, parseLocalDate, parseRRule } from './dates.ts';
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

/** Common repeats; "weekly" follows the task's day. */
export function repeatChips(anchor: LocalDate): { id: string; label: string; rrule: string }[] {
  const weekly = `FREQ=WEEKLY;BYDAY=${RRULE_DAYS[parseLocalDate(anchor).getDay()]}`;
  return [
    { id: 'daily', rrule: 'FREQ=DAILY' },
    { id: 'weekdays', rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
    { id: 'weekly', rrule: weekly },
    { id: 'monthly', rrule: 'FREQ=MONTHLY' },
  ].map((c) => ({ ...c, label: describeRRule(c.rrule) }));
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

// ---------------------------------------------------------------------------
// Patches. "When" is the day you'll do it (scheduledOn, with its time in
// remindAt); "Due" is the deadline (dueOn, with dueAt when it has a time).

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

// A list of days starts on its first matching day: every second week counts from there.
const firstDayRule = (rrule: string) => (rrule.includes('BYDAY=') ? rrule.replace(/;INTERVAL=\d+/, '') : rrule);
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
 * Setting a repeat moves the task to the series' first day, keeping its time.
 * A change of weekdays lands by `daysChangeLanding`. Anything else starts on or
 * after the task's own day, or today if that's gone: "every weekday" on a
 * Saturday task moves it to Monday, "every month" on the 17th stays there.
 */
export function repeatPatch(task: Schedule, rrule: string | null, today: LocalDate): Partial<Schedule> {
  if (!rrule) return { rrule: null };
  const from = task.scheduledOn && task.scheduledOn > today ? task.scheduledOn : today;
  const first = daysChangeLanding(task, rrule, today) ?? occurrenceOnOrAfter(firstDayRule(rrule), from, from);
  const time = task.remindAt ? clockOf(task.remindAt) : null;
  return { rrule, ...whenPatch(first, time) };
}
