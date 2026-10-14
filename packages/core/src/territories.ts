// Territories: the person's places (a class, Work, Home, their own), with
// Customs at the top holding what hasn't been sorted yet. Pure and shared, so
// iOS, web and (later) widgets agree.

import { bySortOrder, byTimeOfDay, nullsLast, stepsByParent, timeOnItsDay } from './order.ts';
import type { ISODateTime, List, LocalDate, Task } from './types.ts';

/**
 * Customs: undated, unfiled captures waiting to be sorted. A repeat, a task
 * with a plan (`hasSteps`) or a checklist line in a note counts as sorted
 * already, even without a date.
 */
export function isInCustoms(t: Task, hasSteps: boolean): boolean {
  return (
    !t.parentId && !t.noteId && !t.completedAt && !t.deletedAt && !t.scheduledOn && !t.dueOn && !t.listId && !t.rrule && !hasSteps
  );
}

/** A plan's steps live where their plan lives; everything else carries its own territory. */
export function effectiveListId(t: Task, byId: Map<string, Task>): string | null {
  return t.parentId ? (byId.get(t.parentId)?.listId ?? null) : t.listId;
}

/** The day a task is on, with missed ones counted as today (they roll forward). */
const dayOf = (t: Task, today: LocalDate): LocalDate | null => {
  const day = t.scheduledOn ?? t.dueOn;
  return day && day < today ? today : day;
};

export interface TerritoryItem {
  task: Task;
  /** The day it's on (today for missed ones), or null when it has no date. */
  date: LocalDate | null;
  at: ISODateTime | null;
}

export interface TerritorySummary {
  list: List;
  /** Open top-level tasks filed here (a plan counts once). */
  open: number;
  /** The most pressing dated item here, plan steps included. */
  next: TerritoryItem | null;
}

export interface TerritoriesView {
  customs: Task[];
  territories: TerritorySummary[];
}

const itemOrder = (a: TerritoryItem, b: TerritoryItem) =>
  nullsLast(a.date, b.date) || byTimeOfDay(a.at, b.at) || bySortOrder(a.task, b.task);

export function buildTerritories(lists: List[], tasks: Task[], today: LocalDate): TerritoriesView {
  const live = tasks.filter((t) => !t.deletedAt);
  const byId = new Map(live.map((t) => [t.id, t]));
  const steps = stepsByParent(live);
  const hasOpenSteps = (t: Task) => (steps.get(t.id) ?? []).some((s) => !s.completedAt);

  const open = new Map<string, number>();
  const next = new Map<string, TerritoryItem>();
  for (const t of live) {
    // A note's checklist lines live in the note (which shows its own progress).
    if (t.completedAt || t.noteId) continue;
    const listId = effectiveListId(t, byId);
    if (!listId) continue;
    if (!t.parentId) open.set(listId, (open.get(listId) ?? 0) + 1);
    // A plan's own row only marks its deadline; its steps carry the work.
    if (hasOpenSteps(t)) continue;
    const date = dayOf(t, today);
    if (!date) continue;
    const item = { task: t, date, at: timeOnItsDay(t) };
    const best = next.get(listId);
    if (!best || itemOrder(item, best) < 0) next.set(listId, item);
  }

  return {
    customs: live.filter((t) => isInCustoms(t, steps.has(t.id))).sort(bySortOrder),
    territories: lists
      .filter((l) => !l.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
      .map((list) => ({ list, open: open.get(list.id) ?? 0, next: next.get(list.id) ?? null })),
  };
}

export interface TerritoryEntry extends TerritoryItem {
  /** A plan: how many of its steps are done. */
  steps?: { done: number; total: number };
}

export interface TerritoryView {
  /** Dated tasks, soonest first (missed ones count as today). */
  comingUp: TerritoryEntry[];
  /** Undated tasks, as arranged. */
  anytime: TerritoryEntry[];
}

/** One territory's open top-level tasks. `null` is Customs. Finished items are left out. */
export function buildTerritory(listId: string | null, tasks: Task[], today: LocalDate): TerritoryView {
  const live = tasks.filter((t) => !t.deletedAt);
  const steps = stepsByParent(live);
  const here = live.filter((t) =>
    listId === null ? isInCustoms(t, steps.has(t.id)) : !t.parentId && !t.noteId && !t.completedAt && t.listId === listId,
  );

  const entries: TerritoryEntry[] = here.map((t) => {
    const plan = steps.get(t.id);
    const entry: TerritoryEntry = { task: t, date: dayOf(t, today), at: timeOnItsDay(t) };
    if (plan?.length) entry.steps = { done: plan.filter((s) => s.completedAt).length, total: plan.length };
    return entry;
  });
  return {
    comingUp: entries.filter((e) => e.date).sort(itemOrder),
    anytime: entries.filter((e) => !e.date).sort((a, b) => bySortOrder(a.task, b.task)),
  };
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * The territory a `#tag` names: an exact match on the name (ignoring case,
 * accents, spaces and punctuation), else the first whose name starts with it,
 * in the person's order. "#chem" and "#chem201" both find "Chem 201".
 */
export function matchTerritory<T extends Pick<List, 'name' | 'sortOrder'>>(tag: string, lists: T[]): T | null {
  const key = normalize(tag);
  if (!key) return null;
  const ordered = [...lists].sort((a, b) => a.sortOrder - b.sortOrder);
  return ordered.find((l) => normalize(l.name) === key) ?? ordered.find((l) => normalize(l.name).startsWith(key)) ?? null;
}
