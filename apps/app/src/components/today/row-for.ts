import {
  canDeclare,
  formatTime,
  isDeclared,
  logicalDateString,
  offersPlan,
  relativeDayPhrase,
  timeOnItsDay,
  voice,
  type AgendaEntry,
} from '@pn/core';

import type { TaskRowItem } from '@/components/task-row';

/** "due today" / "due Fri" */
export const dueLabel = (dueOn: string, today: string) => voice.today.due(relativeDayPhrase(dueOn, today));

/**
 * What Today looks up across its rows. `planned` holds ids of tasks that already have plan steps;
 * `stepDeclared` ids of plans with a step declared (the Oath declares the first one), which don't
 * ask for a start time of their own; `places` names territories and notes by id (a checklist line
 * names its note).
 */
export type RowLookups = { planned: Set<string>; stepDeclared: Set<string>; places: Map<string, string> };

/** A row on Today. `inPlan`: a step listed under its plan's row, so its meta leaves the plan's name out. */
export function rowFor(entry: AgendaEntry, today: string, rolloverHour: number, lookups: RowLookups, inPlan = false): TaskRowItem {
  const { planned, stepDeclared, places } = lookups;
  const t = entry.task;
  const meta: string[] = [];
  if (entry.parentTitle) meta.push(inPlan ? `step ${entry.stepIndex} of ${entry.stepCount}` : `${entry.parentTitle} · step ${entry.stepIndex} of ${entry.stepCount}`);
  else {
    const place = t.noteId ? places.get(t.noteId) : t.listId ? places.get(t.listId) : undefined;
    if (place) meta.push(place);
    if (t.dueOn) meta.push(dueLabel(t.dueOn, today));
  }
  if (entry.done && t.completedAt) {
    // Finished today: the time. A plan's step finished on an earlier day: the day.
    const finished = new Date(t.completedAt);
    const day = logicalDateString(finished, rolloverHour);
    meta.push(day === today ? formatTime(finished) : voice.today.doneOn(relativeDayPhrase(day, today)));
  }
  const clock = timeOnItsDay(t);
  const declared = !entry.done && isDeclared(t, today);
  return {
    id: t.id,
    title: t.title,
    meta: meta.join(' · ') || undefined,
    rrule: t.rrule ?? undefined,
    minutes: t.estimateMinutes ?? undefined,
    time: clock && !entry.done ? formatTime(new Date(clock)) : undefined,
    done: entry.done,
    suggestPlan: !entry.done && offersPlan(t, planned.has(t.id)),
    declared,
    offerDeclare: !entry.done && !declared && !stepDeclared.has(t.id) && canDeclare(t),
  };
}
