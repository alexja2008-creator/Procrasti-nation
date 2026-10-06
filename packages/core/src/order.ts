// Ordering helpers shared by Today and Upcoming. Internal: not re-exported
// from the package index.

import type { Task } from './types.ts';

export const bySortOrder = (a: Task, b: Task) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);

export const nullsLast = (a: string | null, b: string | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a.localeCompare(b);

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
