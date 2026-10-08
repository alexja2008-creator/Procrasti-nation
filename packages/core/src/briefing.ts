// The Morning Briefing: what carried over from before today, and the patches
// that give each thing a place again. Nothing here is "overdue": a missed day
// is just a day that passed (PN2-MORNING-PLAN.md).

import { clockOf } from './dates.ts';
import { bySortOrder, nullsLast, stepsByParent } from './order.ts';
import { fallbackStepDates } from './planning.ts';
import type { LocalDate, Task } from './types.ts';
import { whenPatch, type ClockTime, type Schedule } from './when.ts';

export interface PlanLeftovers {
  plan: Task;
  /** Its steps whose day has passed, in step order. */
  steps: Task[];
  /** Every open step, in step order: what Re-spread the rest moves. */
  open: Task[];
}

export interface Briefing {
  /** Plans with at least one step carried over, the nearest deadline first. */
  plans: PlanLeftovers[];
  /** Everything else carried over (tasks, a note's checklist lines), the oldest day first. */
  loose: Task[];
  /** How many things carried over, steps counted one by one. */
  count: number;
}

const isOpen = (t: Task) => !t.deletedAt && t.completedAt === null;

/** The day a carried-over task was meant for: its day, or else its deadline. */
export const missedDay = (t: Pick<Task, 'scheduledOn' | 'dueOn'>): LocalDate | null => t.scheduledOn ?? t.dueOn;

/**
 * An open one-off whose chosen day has passed: scheduled before today, or with
 * no day and a deadline before today. A repeat never carries over (it shows
 * once on Today and moves on when checked off), and a task already given today
 * or a later day hasn't carried over even if its deadline passed.
 */
export function carriedOver(t: Task, today: LocalDate): boolean {
  if (!isOpen(t) || t.rrule) return false;
  const day = missedDay(t);
  return day !== null && day < today;
}

export function briefingOf(tasks: Task[], today: LocalDate): Briefing {
  const live = tasks.filter((t) => !t.deletedAt);
  const steps = stepsByParent(live);
  const byId = new Map(live.map((t) => [t.id, t]));
  const hasOpenSteps = (t: Task) => (steps.get(t.id) ?? []).some(isOpen);

  const plans: PlanLeftovers[] = [];
  for (const [parentId, list] of steps) {
    const plan = byId.get(parentId);
    const missed = list.filter((s) => carriedOver(s, today));
    if (plan && isOpen(plan) && missed.length) plans.push({ plan, steps: missed, open: list.filter(isOpen) });
  }
  plans.sort((a, b) => nullsLast(a.plan.dueOn, b.plan.dueOn) || nullsLast(missedDay(a.steps[0]), missedDay(b.steps[0])));

  // A plan with open steps is sorted through its steps, never as a task of its own.
  const loose = live
    .filter((t) => !t.parentId && !hasOpenSteps(t) && carriedOver(t, today))
    .sort((a, b) => nullsLast(missedDay(a), missedDay(b)) || bySortOrder(a, b));

  return { plans, loose, count: loose.length + plans.reduce((n, p) => n + p.steps.length, 0) };
}

type Dated = Pick<Task, 'scheduledOn' | 'remindAt' | 'dueOn' | 'dueAt'>;

const timeOf = (t: Pick<Task, 'remindAt'>): ClockTime | null => (t.remindAt ? clockOf(t.remindAt) : null);
// A deadline that has passed comes off when the task gets a later day or none, or it would keep showing on Today.
const passedDeadline = (t: Dated, today: LocalDate): Partial<Schedule> =>
  t.dueOn !== null && t.dueOn < today ? { dueOn: null, dueAt: null } : {};

/** Today: its day becomes today, keeping its time. A passed deadline stays, as context. */
export const todayPatch = (t: Dated, today: LocalDate): Partial<Schedule> => whenPatch(today, timeOf(t));

/** Pick a day: the day (and time) chosen in the When sheet. */
export function dayPatch(t: Dated, today: LocalDate, day: LocalDate, time: ClockTime | null): Partial<Schedule> {
  return { ...whenPatch(day, time), ...(day > today ? passedDeadline(t, today) : {}) };
}

/** Let it go: no day any more. A deadline still ahead stays, so it comes back that day. */
export const letGoPatch = (t: Dated, today: LocalDate): Partial<Schedule> => ({ scheduledOn: null, remindAt: null, ...passedDeadline(t, today) });

/**
 * Re-spread the rest: a plan's open steps spread out again from today to its
 * deadline (one a day without one, or once it has passed), in step order,
 * each keeping its time. Steps already on their new day are left out.
 */
export function respreadPatches(plan: Pick<Task, 'dueOn'>, open: Task[], today: LocalDate): { task: Task; patch: Partial<Schedule> }[] {
  const days = fallbackStepDates(open.length, today, plan.dueOn);
  return open
    .map((task, i) => ({ task, patch: whenPatch(days[i], timeOf(task)) }))
    .filter(({ task, patch }) => patch.scheduledOn !== task.scheduledOn || patch.remindAt !== task.remindAt);
}

/** The fields a patch changed, as they were: what Undo writes back. */
export function undoPatch<T extends object, P extends Partial<T>>(task: T, patch: P): P {
  return Object.fromEntries(Object.keys(patch).map((k) => [k, task[k as keyof T]])) as P;
}
