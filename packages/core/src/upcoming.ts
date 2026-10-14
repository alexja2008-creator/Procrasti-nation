// What Upcoming shows: everything scheduled or due after today, by day. Today
// keeps today and anything missed; Upcoming starts tomorrow. Pure and shared,
// so iOS, web and (later) widgets agree. Calendar events (Phase 5) will join
// as another entry kind, merged into the same days.

import { addDays, daysBetween, formatShortDate } from './dates.ts';
import { bySortOrder, byTimeOfDay, stepsByParent, timeOnItsDay } from './order.ts';
import type { ISODateTime, LocalDate, Task } from './types.ts';

export interface UpcomingEntry {
  task: Task;
  /** A to-do (with a checkbox), or a deadline marker on the day a task is due. */
  kind: 'task' | 'deadline';
  /** The day it's on. */
  date: LocalDate;
  /** Its time that day: `remindAt` on its scheduled day, `dueAt` on its due day. */
  at: ISODateTime | null;
  /** Plan steps carry their parent's title and position ("step 3 of 6"). */
  parentTitle?: string;
  stepIndex?: number;
  stepCount?: number;
}

export interface UpcomingDay {
  date: LocalDate;
  entries: UpcomingEntry[];
}

export interface UpcomingView {
  /** The next 7 days always (empty or not), then days with something, up to `weeks` out. */
  days: UpcomingDay[];
  /** Anything further out, by date. */
  later: UpcomingEntry[];
}

/** Days shown even when empty, so there's always a week to add to. */
const FIXED_DAYS = 7;

// Within a day: timed to-dos by time, then deadline markers, then the rest as arranged.
const rank = (e: UpcomingEntry) => (e.kind === 'deadline' ? 1 : e.at ? 0 : 2);

function entryOrder(a: UpcomingEntry, b: UpcomingEntry): number {
  return (
    a.date.localeCompare(b.date) ||
    rank(a) - rank(b) ||
    byTimeOfDay(a.at, b.at) ||
    bySortOrder(a.task, b.task)
  );
}

export function buildUpcoming(tasks: Task[], today: LocalDate, { weeks = 8 } = {}): UpcomingView {
  const live = tasks.filter((t) => !t.deletedAt);
  const byId = new Map(live.map((t) => [t.id, t]));
  const steps = stepsByParent(live);
  // A plan's work happens in its open steps; its own row only marks the deadline.
  const hasOpenSteps = (t: Task) => (steps.get(t.id) ?? []).some((s) => !s.completedAt);

  const entries: UpcomingEntry[] = [];
  for (const t of live) {
    if (t.completedAt) continue;
    const planned = hasOpenSteps(t);

    const day = t.scheduledOn ?? t.dueOn;
    if (!planned && day && day > today) {
      const entry: UpcomingEntry = { task: t, kind: 'task', date: day, at: timeOnItsDay(t) };
      if (t.parentId) {
        const siblings = steps.get(t.parentId) ?? [t];
        entry.parentTitle = byId.get(t.parentId)?.title;
        entry.stepIndex = siblings.indexOf(t) + 1;
        entry.stepCount = siblings.length;
      }
      entries.push(entry);
    }

    // The due day gets a marker when the work happens on other days.
    const workedEarlier = planned || (t.scheduledOn !== null && t.dueOn !== null && t.scheduledOn < t.dueOn);
    if (t.dueOn && t.dueOn > today && workedEarlier) {
      entries.push({ task: t, kind: 'deadline', date: t.dueOn, at: t.dueAt });
    }
  }
  entries.sort(entryOrder);

  const lastFixed = addDays(today, FIXED_DAYS);
  const horizon = addDays(today, weeks * 7);
  const days: UpcomingDay[] = [];
  for (let i = 1; i <= FIXED_DAYS; i++) days.push({ date: addDays(today, i), entries: [] });
  const later: UpcomingEntry[] = [];

  for (const e of entries) {
    if (e.date > horizon) later.push(e);
    else if (e.date <= lastFixed) days[daysBetween(today, e.date) - 1].entries.push(e);
    else if (days.at(-1)!.date === e.date) days.at(-1)!.entries.push(e);
    else days.push({ date: e.date, entries: [e] });
  }
  return { days, later };
}

/** "Tomorrow · Wed 7 Oct", or "Thu 8 Oct": a day's heading in Upcoming. */
export function upcomingDayLabel(date: LocalDate, today: LocalDate): string {
  return date === addDays(today, 1) ? `Tomorrow · ${formatShortDate(date)}` : formatShortDate(date);
}

/** How many entries fall on each day, Later included: the calendar's dots. */
export function upcomingCounts(view: UpcomingView): Record<LocalDate, number> {
  const counts: Record<LocalDate, number> = {};
  for (const e of [...view.days.flatMap((d) => d.entries), ...view.later]) counts[e.date] = (counts[e.date] ?? 0) + 1;
  return counts;
}

/**
 * The section to show for a day picked on the calendar: that day, else the
 * next one listed, else Later. Today and earlier land on the first day.
 */
export function upcomingSectionFor(view: UpcomingView, date: LocalDate): LocalDate | 'later' {
  const day = view.days.find((d) => d.date >= date);
  if (day) return day.date;
  return view.later.length ? 'later' : view.days.at(-1)!.date;
}
