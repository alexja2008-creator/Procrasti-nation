// Declarations: a start time signed for one task (docs/plans/shipped/declarations.md). The time is the
// task's own When (`scheduledOn` + `remindAt`), so every reminder path already rings it;
// `declaredAt` says it was signed. Any other change of When withdraws it (`whenPatch`).

import { addDays, atLocalTime, formatTime, localDateString, relativeDayPhrase } from './dates.ts';
import type { LocalDate, Task } from './types.ts';
import { whenPatch, type ClockTime, type Schedule } from './when.ts';

/** Opening Start Mode from this long before the declared time keeps the Declaration… */
export const KEEP_BEFORE_MINUTES = 15;
/** …up to this long after it. */
export const KEEP_AFTER_MINUTES = 60;

/** Open one-offs only: a repeat would need a signature for each time it comes round. */
export const canDeclare = (t: Pick<Task, 'completedAt' | 'deletedAt' | 'rrule'>): boolean => !t.completedAt && !t.deletedAt && !t.rrule;

/** Signing: the day and time become the task's When, signed `now`. */
export const declarePatch = (day: LocalDate, time: ClockTime, now: Date): Partial<Schedule> => ({
  ...whenPatch(day, time),
  declaredAt: now.toISOString(),
});

/**
 * A Declaration still to come or under way: signed, open, and on today or later. One whose
 * day has passed just carries over like anything else; nothing marks it.
 */
export const isDeclared = (t: Pick<Task, 'declaredAt' | 'remindAt' | 'scheduledOn' | 'completedAt'>, today: LocalDate): boolean =>
  !!t.declaredAt && !!t.remindAt && !t.completedAt && !!t.scheduledOn && t.scheduledOn >= today;

/** Whether starting `now` keeps the Declaration: from 15 minutes before its time to an hour after. */
export function keepsDeclaration(t: Pick<Task, 'declaredAt' | 'remindAt'>, now: Date): boolean {
  if (!t.declaredAt || !t.remindAt) return false;
  const at = Date.parse(t.remindAt);
  const ms = now.getTime();
  return ms >= at - KEEP_BEFORE_MINUTES * 60_000 && ms <= at + KEEP_AFTER_MINUTES * 60_000;
}

/** "at 4:00 PM today", "at 9:00 AM tomorrow", "at 3:00 PM on Fri", "at 3:00 PM on Fri 23 Oct". */
export function declaredWhen(day: LocalDate, time: ClockTime, today: LocalDate): string {
  const clock = formatTime(new Date(atLocalTime(day, time.hour, time.minute)));
  const phrase = relativeDayPhrase(day, today);
  return `at ${clock} ${phrase === 'today' || phrase === 'tomorrow' ? phrase : `on ${phrase}`}`;
}

/** "In 15 min": that many minutes from `now`, rounded up to the next five (it may be tomorrow). */
export function startSoon(now: Date, minutes = 15): { day: LocalDate; time: ClockTime } {
  const at = new Date(now.getTime() + minutes * 60_000);
  const rounded = Math.ceil((at.getHours() * 60 + at.getMinutes()) / 5) * 5;
  const day = localDateString(at);
  if (rounded >= 24 * 60) return { day: addDays(day, 1), time: { hour: 0, minute: 0 } };
  return { day, time: { hour: Math.floor(rounded / 60), minute: rounded % 60 } };
}

/** Whether a day and time are still ahead of `now` (a Declaration is for later, never the past). */
export const isAhead = (day: LocalDate, time: ClockTime, now: Date): boolean =>
  Date.parse(atLocalTime(day, time.hour, time.minute)) > now.getTime();
