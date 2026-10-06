// Ordering helpers shared by Today and Upcoming. Internal: not re-exported
// from the package index.

import { clockOf } from './dates.ts';
import type { ISODateTime, Task } from './types.ts';

export const bySortOrder = (a: Task, b: Task) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);

export const nullsLast = (a: string | null, b: string | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a.localeCompare(b);

/**
 * Earlier time of day first, nulls (untimed) last. Compares the local clock,
 * not the whole timestamp: a missed item rolled forward keeps its old date.
 */
export function byTimeOfDay(a: ISODateTime | null, b: ISODateTime | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const minutes = (iso: ISODateTime) => {
    const { hour, minute } = clockOf(iso);
    return hour * 60 + minute;
  };
  return minutes(a) - minutes(b);
}

/** Each plan's steps (live child rows), in plan order, keyed by parent id. */
export function stepsByParent(live: Task[]): Map<string, Task[]> {
  const steps = new Map<string, Task[]>();
  for (const t of live) {
    if (!t.parentId) continue;
    const list = steps.get(t.parentId) ?? [];
    list.push(t);
    steps.set(t.parentId, list);
  }
  for (const list of steps.values()) list.sort(bySortOrder);
  return steps;
}
