// What checking a task off does, shared by every list's checkbox and a
// reminder's Done button so the two can never disagree: a one-off finishes; a
// repeat moves on to its next date (keeping its time) and stays open.

import { atLocalTime, clockOf, nextOccurrence } from './dates.ts';
import type { LocalDate, Task } from './types.ts';

export type CheckOffPatch = Partial<Pick<Task, 'status' | 'completedAt' | 'scheduledOn' | 'remindAt'>>;

export interface CheckOff {
  patch: CheckOffPatch;
  /** Where a repeat moved to; null when the task finished. */
  movedTo: LocalDate | null;
}

/**
 * Checking off an open task on `today` (the person's day, rollover included).
 * A repeat skips any occurrences it missed, like Reminders does. (Anchoring on
 * the current date can drift a monthly-on-the-31st series; fine for now.)
 */
export function checkOff(task: Pick<Task, 'rrule' | 'scheduledOn' | 'remindAt'>, today: LocalDate, now: Date = new Date()): CheckOff {
  if (!task.rrule) return { patch: { status: 'completed', completedAt: now.toISOString() }, movedTo: null };
  const anchor = task.scheduledOn ?? today;
  const next = nextOccurrence(task.rrule, anchor, anchor > today ? anchor : today);
  const time = task.remindAt ? clockOf(task.remindAt) : null;
  return { patch: { scheduledOn: next, remindAt: time ? atLocalTime(next, time.hour, time.minute) : null }, movedTo: next };
}
