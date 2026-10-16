// Helpers around the AI Adherence Planner ("Plan it").

import { addDays, clockOf, daysBetween } from './dates.ts';
import { isDeclared } from './declarations.ts';
import type { LocalDate, Task } from './types.ts';
import { whenPatch, type Schedule } from './when.ts';

/**
 * Estimate text → minutes: "15 min", "1.5 hours", "1h 30m", "20". Ranges like
 * "10-15 min" take the upper bound. Matches v2_parse_minutes() in the backfill.
 */
export function parseMinutes(value: string | null | undefined): number | null {
  const v = (value ?? '').toLowerCase();
  const hours = Number(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/.exec(v)?.[1] ?? 0);
  const mins = Number(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/.exec(v)?.[1] ?? 0);
  const bare = Number(/^\s*(\d+)\s*$/.exec(v)?.[1] ?? 0);
  const total = Math.round(hours * 60 + mins + bare);
  return total > 0 ? total : null;
}

/**
 * Dates for plan steps when AI date resolution isn't available: spread from
 * today to the due date (or one step a day with no due date).
 */
export function fallbackStepDates(count: number, today: LocalDate, dueOn: LocalDate | null): LocalDate[] {
  const span = dueOn && dueOn > today ? daysBetween(today, dueOn) : null;
  return Array.from({ length: count }, (_, i) => {
    if (span === null) return addDays(today, i);
    return addDays(today, count > 1 ? Math.round((i * span) / (count - 1)) : 0);
  });
}

/** Days in plan order: none before `floor`, none before the one ahead of it. */
function inOrder(days: LocalDate[], floor: LocalDate): LocalDate[] {
  let last = floor;
  return days.map((d) => (last = d > last ? d : last));
}

/**
 * Days that follow an anchor moved from `from` to `to`, in plan order: each
 * keeps its distance after it, and none lands before it or before the day
 * ahead of it (a plan already out of order comes back into order). The
 * deadline never moves on its own: if the shift would pass `dueOn`, they spread
 * out after the new day up to it, none earlier than it already was (they're
 * being pushed later) and none past it; if the new day is the deadline they
 * share it, and if it's already past, they go one a day after it.
 */
export function followDays(days: LocalDate[], from: LocalDate, to: LocalDate, dueOn: LocalDate | null): LocalDate[] {
  const shifted = inOrder(
    days.map((d) => addDays(d, daysBetween(from, to))),
    to,
  );
  if (!dueOn || shifted.every((d) => d <= dueOn)) return shifted;
  if (to > dueOn) return days.map((_, i) => addDays(to, i + 1));
  const span = daysBetween(to, dueOn);
  const spread = days.map((d, i) => {
    const even = span === 0 ? dueOn : addDays(to, Math.max(1, Math.round(((i + 1) * span) / days.length)));
    const was = d > dueOn ? dueOn : d;
    return was > even ? was : even;
  });
  return inOrder(spread, to);
}

/**
 * A plan's step moved to a later day: the open, dated steps after it (in plan
 * order), as patches that move them with it, each keeping its time. Asked for
 * each time, never automatic (Alex, 2026-10-15). A step with its own signed
 * Declaration stays put, and moving a step earlier, or giving it its first day,
 * moves nothing.
 */
export function followPatches(
  steps: Task[],
  before: Task,
  to: LocalDate,
  dueOn: LocalDate | null,
  today: LocalDate,
): { task: Task; patch: Partial<Schedule> }[] {
  const from = before.scheduledOn;
  if (!before.parentId || !from || to <= from) return [];
  const later = steps
    .filter(
      (s) =>
        s.parentId === before.parentId &&
        s.id !== before.id &&
        s.sortOrder > before.sortOrder &&
        !s.completedAt &&
        !s.deletedAt &&
        !!s.scheduledOn &&
        !isDeclared(s, today),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const days = followDays(
    later.map((s) => s.scheduledOn!),
    from,
    to,
    dueOn,
  );
  return later
    .map((task, i) => ({ task, patch: whenPatch(days[i], task.remindAt ? clockOf(task.remindAt) : null) }))
    .filter(({ task, patch }) => patch.scheduledOn !== task.scheduledOn);
}

/** Plan it's step days, starting on the task's When day when that's later than the first step's (D4). */
export function startPlanOn(days: LocalDate[], start: LocalDate | null, dueOn: LocalDate | null): LocalDate[] {
  if (!start || !days.length || start <= days[0]) return days;
  return [start, ...followDays(days.slice(1), days[0], start, dueOn)];
}

/** v2's procrastination styles → the planner prompt's style keys (lib/prompts/plan.js). */
export function plannerStyle(style: string | undefined): string | undefined {
  return ({ avoid: 'avoider', perfectionist: 'perfectionist', overwhelmed: 'overwhelmed', bored: 'boredom' } as Record<string, string>)[style ?? ''];
}

/**
 * The new `sortOrder` for the item moved from index `from` to `to` in a list
 * sorted by `orders`: halfway between its new neighbours, so only the moved
 * row is written.
 */
export function sortOrderForMove(orders: number[], from: number, to: number): number {
  const rest = orders.filter((_, i) => i !== from);
  const before = rest[to - 1];
  const after = rest[to];
  if (before === undefined && after === undefined) return orders[from];
  if (before === undefined) return after - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}
