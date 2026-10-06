// What Today shows, derived from the person's tasks. Pure and shared, so iOS,
// web and (later) widgets agree. Missed items roll forward into Today without
// any "overdue" styling: kind, never punishing.

import { logicalDateString } from './dates.ts';
import { bySortOrder, nullsLast, stepsByParent } from './order.ts';
import type { LocalDate, Task } from './types.ts';

export interface AgendaEntry {
  task: Task;
  done: boolean;
  /** Plan steps carry their parent's title and position ("step 3 of 6"). */
  parentTitle?: string;
  stepIndex?: number;
  stepCount?: number;
}

export interface TodayView {
  /** Open items for today (including missed ones), then what was finished today. */
  agenda: AgendaEntry[];
  /** Undated, unsorted captures waiting to be sorted. */
  customs: Task[];
  /** "Your next small step": the most urgent open plan step due by today. */
  nextStep: AgendaEntry | null;
  /**
   * With no plan step due, the most pressing open task without a set time, so
   * Today always offers one thing to Start. Timed items happen at their time.
   */
  upNext: AgendaEntry | null;
}

function agendaOrder(a: AgendaEntry, b: AgendaEntry): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.done) return nullsLast(a.task.completedAt, b.task.completedAt);
  // Timed items first, by time; then by deadline; then as arranged.
  return (
    nullsLast(a.task.remindAt, b.task.remindAt) ||
    nullsLast(a.task.dueOn, b.task.dueOn) ||
    bySortOrder(a.task, b.task)
  );
}

/** `rolloverHour` is when the person's day ends (a night owl's Tuesday can end at 3am). */
export function buildToday(tasks: Task[], today: LocalDate, rolloverHour = 0): TodayView {
  const live = tasks.filter((t) => !t.deletedAt);
  const byId = new Map(live.map((t) => [t.id, t]));

  const childrenOf = stepsByParent(live);

  const isDone = (t: Task) => t.completedAt !== null;
  const doneToday = (t: Task) => t.completedAt !== null && logicalDateString(new Date(t.completedAt), rolloverHour) === today;
  const inToday = (t: Task) => (t.scheduledOn !== null && t.scheduledOn <= today) || (t.dueOn !== null && t.dueOn <= today);

  const toEntry = (t: Task): AgendaEntry => {
    if (!t.parentId) return { task: t, done: isDone(t) };
    const siblings = childrenOf.get(t.parentId) ?? [t];
    return {
      task: t,
      done: isDone(t),
      parentTitle: byId.get(t.parentId)?.title,
      stepIndex: siblings.indexOf(t) + 1,
      stepCount: siblings.length,
    };
  };

  const entries = live.filter((t) => inToday(t) && (!isDone(t) || doneToday(t))).map(toEntry);

  const nextStep =
    entries
      .filter((e) => e.task.parentId && !e.done)
      .sort((a, b) => {
        const pa = byId.get(a.task.parentId!);
        const pb = byId.get(b.task.parentId!);
        return nullsLast(pa?.dueOn ?? null, pb?.dueOn ?? null) || nullsLast(a.task.scheduledOn, b.task.scheduledOn) || bySortOrder(a.task, b.task);
      })[0] ?? null;

  const upNext = nextStep
    ? null
    : (entries
        .filter((e) => !e.done && !e.task.remindAt && !e.task.dueAt)
        .sort(
          (a, b) =>
            // Deadlines first, one-offs before repeats, missed before new, then as arranged.
            nullsLast(a.task.dueOn, b.task.dueOn) ||
            Number(!!a.task.rrule) - Number(!!b.task.rrule) ||
            nullsLast(a.task.scheduledOn, b.task.scheduledOn) ||
            bySortOrder(a.task, b.task),
        )[0] ?? null);

  return {
    agenda: entries.filter((e) => e !== nextStep && e !== upNext).sort(agendaOrder),
    customs: live
      // A task with a plan is sorted already, even without a date.
      .filter((t) => !t.parentId && !isDone(t) && !t.scheduledOn && !t.dueOn && !t.listId && !t.rrule && !childrenOf.has(t.id))
      .sort(bySortOrder),
    nextStep,
    upNext,
  };
}

export interface StepContext {
  parent: Task | undefined;
  /** 1-based position among the plan's steps. */
  index: number;
  count: number;
  /** The next open step after this one (wrapping to an earlier skipped one). */
  next: Task | null;
}

/** A plan step's place in its plan ("step 2 of 6") and what comes after it. Null for top-level tasks. */
export function stepContext(tasks: Task[], step: Task): StepContext | null {
  if (!step.parentId) return null;
  const siblings = tasks.filter((t) => t.parentId === step.parentId && !t.deletedAt).sort(bySortOrder);
  const at = siblings.findIndex((t) => t.id === step.id);
  const open = (t: Task) => t.completedAt === null && t.id !== step.id;
  return {
    parent: tasks.find((t) => t.id === step.parentId),
    index: at + 1,
    count: siblings.length,
    next: siblings.slice(at + 1).find(open) ?? siblings.find(open) ?? null,
  };
}
