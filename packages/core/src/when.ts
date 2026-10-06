// Picking dates in task detail: one-tap day, time and repeat chips, a month
// grid, and the task patches they produce. Pure, so iOS, web and (later)
// Upcoming agree. Weeks start on Monday.

import { addDays, atLocalTime, clockOf, describeRRule, occurrenceOnOrAfter, parseLocalDate } from './dates.ts';
import type { LocalDate, Task } from './types.ts';

export interface ClockTime {
  hour: number;
  minute: number;
}

export interface DayChip {
  id: 'today' | 'tomorrow' | 'weekend' | 'next-week';
  label: string;
  date: LocalDate;
}

export function dayChips(today: LocalDate): DayChip[] {
  const dow = parseLocalDate(today).getDay(); // 0 = Sunday
  return [
    { id: 'today', label: 'Today', date: today },
    { id: 'tomorrow', label: 'Tomorrow', date: addDays(today, 1) },
    // On a weekend, "this weekend" is today; otherwise the coming Saturday.
    { id: 'weekend', label: 'This weekend', date: dow === 0 || dow === 6 ? today : addDays(today, 6 - dow) },
    { id: 'next-week', label: 'Next week', date: addDays(today, (8 - dow) % 7 || 7) },
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

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

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

export type Schedule = Pick<Task, 'scheduledOn' | 'remindAt' | 'dueOn' | 'dueAt' | 'rrule'>;

/** Clearing "When" also clears the repeat: a series needs a day to start from. */
export function whenPatch(day: LocalDate | null, time: ClockTime | null): Partial<Schedule> {
  if (!day) return { scheduledOn: null, remindAt: null, rrule: null };
  return { scheduledOn: day, remindAt: time ? atLocalTime(day, time.hour, time.minute) : null };
}

export function duePatch(day: LocalDate | null, time: ClockTime | null): Partial<Schedule> {
  return { dueOn: day, dueAt: day && time ? atLocalTime(day, time.hour, time.minute) : null };
}

/**
 * Setting a repeat moves the task to the series' first day on or after its
 * current one (or today), keeping its time; e.g. "every weekday" on a
 * Saturday task moves it to Monday.
 */
export function repeatPatch(task: Schedule, rrule: string | null, today: LocalDate): Partial<Schedule> {
  if (!rrule) return { rrule: null };
  const from = task.scheduledOn ?? today;
  const first = occurrenceOnOrAfter(rrule, from, from);
  const time = task.remindAt ? clockOf(task.remindAt) : null;
  return { rrule, ...whenPatch(first, time) };
}
