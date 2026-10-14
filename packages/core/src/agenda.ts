// What Today shows, derived from the person's tasks. Pure and shared, so iOS,
// web and (later) widgets agree. Missed items roll forward into Today without
// any "overdue" styling: kind, never punishing.

import { logicalDateString } from './dates.ts';
import { bySortOrder, byTimeOfDay, nullsLast, stepsByParent, timeOnItsDay } from './order.ts';
import { isInCustoms } from './territories.ts';
import type { LocalDate, Task } from './types.ts';

export { timeOnItsDay };

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
  // Timed items first, by time of day (missed ones keep their old date); then by deadline; then as arranged.
  return (
    byTimeOfDay(timeOnItsDay(a.task), timeOnItsDay(b.task)) ||
    nullsLast(a.task.dueOn, b.task.dueOn) ||
    bySortOrder(a.task, b.task)
  );
}

/** `rolloverHour` is when the person's day ends (with Day ends at 3 AM, Tuesday lasts until 3am Wednesday). */
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
    customs: live.filter((t) => isInCustoms(t, childrenOf.has(t.id))).sort(bySortOrder),
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

/** A plan's first open step in step order (what Start starts for the plan), or null when none is left. */
export function nextOpenStep(tasks: Task[], planId: string): Task | null {
  return tasks.filter((t) => t.parentId === planId && !t.deletedAt && !t.completedAt).sort(bySortOrder)[0] ?? null;
}

/**
 * What Start starts for a task: a plan's next open step, so the timer comes with that step's
 * words (Alex, 2026-10-14: a reminder's Start 5 min on a plan had timed the plan itself). A
 * step, a task without steps, or a plan with none open starts itself.
 */
export function startTarget(tasks: Task[], id: string): string {
  const task = tasks.find((t) => t.id === id && !t.deletedAt);
  if (!task || task.parentId) return id;
  return nextOpenStep(tasks, id)?.id ?? id;
}

/**
 * The plan whose every step is now finished while it's still open, after `step` is checked off:
 * the app asks before marking it done (Alex, 2026-10-14). Null otherwise.
 */
export function planToFinish(tasks: Task[], step: Pick<Task, 'id' | 'parentId'>): Task | null {
  if (!step.parentId) return null;
  const plan = tasks.find((t) => t.id === step.parentId && !t.deletedAt);
  if (!plan || plan.completedAt) return null;
  const steps = tasks.filter((t) => t.parentId === plan.id && !t.deletedAt);
  return steps.length > 0 && steps.every((t) => t.id === step.id || t.completedAt) ? plan : null;
}

export interface PlanGroup {
  plan: Task;
  /** The plan's steps on Today, in step order (every open one when the plan itself is due). */
  steps: AgendaEntry[];
  /** Its live steps: finished (on any day), and all of them. */
  done: number;
  total: number;
  /** Every step finished, the plan still open: Today offers to mark it done. */
  readyToFinish: boolean;
  /** The plan itself finished (today: earlier days don't show). */
  finished: boolean;
}

export type TodayItem = { kind: 'task'; entry: AgendaEntry } | { kind: 'plan'; group: PlanGroup };

const isOpenItem = (item: TodayItem) => (item.kind === 'task' ? !item.entry.done : !item.group.finished);

/**
 * Today's agenda with each plan as one item, its steps behind it (Alex, 2026-10-14: two plans
 * of seven steps read "Fourteen things today"). The next small step joins its plan's group; a
 * plan that is itself Up next stays in that card. `openCount` is what's left to do today, a
 * plan counting once, the Up next card included.
 */
export function groupAgenda(view: TodayView, tasks: Task[]): { items: TodayItem[]; openCount: number } {
  const live = tasks.filter((t) => !t.deletedAt);
  const byId = new Map(live.map((t) => [t.id, t]));
  const childrenOf = stepsByParent(live);
  const upNextId = view.upNext?.task.id;
  const entries = view.nextStep ? [view.nextStep, ...view.agenda] : view.agenda;

  const items: TodayItem[] = [];
  const groups = new Map<string, PlanGroup>();
  const planDue = new Set<string>();
  for (const entry of entries) {
    const planId = entry.task.parentId ?? (childrenOf.has(entry.task.id) ? entry.task.id : null);
    const plan = planId ? byId.get(planId) : undefined;
    if (!plan || plan.id === upNextId) {
      if (!plan) items.push({ kind: 'task', entry });
      continue;
    }
    let group = groups.get(plan.id);
    if (!group) {
      const steps = childrenOf.get(plan.id) ?? [];
      const done = steps.filter((t) => t.completedAt).length;
      group = { plan, steps: [], done, total: steps.length, readyToFinish: !plan.completedAt && done === steps.length, finished: !!plan.completedAt };
      groups.set(plan.id, group);
      items.push({ kind: 'plan', group });
    }
    if (entry.task.parentId) group.steps.push(entry);
    else planDue.add(plan.id);
  }

  for (const group of groups.values()) {
    const steps = childrenOf.get(group.plan.id) ?? [];
    const step = (t: Task): AgendaEntry => ({
      task: t,
      done: t.completedAt !== null,
      parentTitle: group.plan.title,
      stepIndex: steps.indexOf(t) + 1,
      stepCount: steps.length,
    });
    // The plan itself is due: every open step, whatever its day.
    if (planDue.has(group.plan.id)) {
      const listed = new Set(group.steps.map((e) => e.task.id));
      group.steps.push(...steps.filter((t) => !t.completedAt && !listed.has(t.id)).map(step));
    }
    group.steps.sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0));
  }

  // What's left first (a plan waiting to be marked done among it), then what was finished today.
  const ordered = [...items.filter(isOpenItem), ...items.filter((i) => !isOpenItem(i))];
  return { items: ordered, openCount: ordered.filter(isOpenItem).length + (view.upNext ? 1 : 0) };
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
