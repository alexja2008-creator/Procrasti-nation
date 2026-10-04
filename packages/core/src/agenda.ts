// What Today shows, derived from the person's tasks. Pure and shared, so iOS,
// web and (later) widgets agree. Missed items roll forward into Today without
// any "overdue" styling: kind, never punishing.

import { logicalDateString } from './dates.ts';
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
}

const bySortOrder = (a: Task, b: Task) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);
const nullsLast = (a: string | null, b: string | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a.localeCompare(b));

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

  const childrenOf = new Map<string, Task[]>();
  for (const t of live) {
    if (!t.parentId) continue;
    const list = childrenOf.get(t.parentId) ?? [];
    list.push(t);
    childrenOf.set(t.parentId, list);
  }
  for (const list of childrenOf.values()) list.sort(bySortOrder);

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

  return {
    agenda: entries.filter((e) => e !== nextStep).sort(agendaOrder),
    customs: live
      .filter((t) => !t.parentId && !isDone(t) && !t.scheduledOn && !t.dueOn && !t.listId && !t.rrule)
      .sort(bySortOrder),
    nextStep,
  };
}
