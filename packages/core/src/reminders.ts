// Reminders: what should ring, and when. Planned here, scheduled on the
// device: the app compares this plan with what the phone has pending and
// changes only the difference, so finishing, re-timing, retitling or deleting
// a task needs no special case. Pure and shared, so iOS (now), Web Push (next)
// and the tests agree.
//
// What rings: a task's time on its day (each time a repeat comes round), a
// deadline with a time, and the optional morning list.

import { buildToday } from './agenda.ts';
import { addDays, atLocalTime, clockOf, describeRRule, formatTime, localDateString, logicalDateString, nextOccurrence, occurrenceOnOrAfter } from './dates.ts';
import { voice } from './nation.ts';
import { stepsByParent } from './order.ts';
import { effectiveListId } from './territories.ts';
import type { List, LocalDate, MorningList, Preferences, Task } from './types.ts';

/** How far ahead reminders are lined up. The app tops them up whenever it opens. */
export const REMINDER_DAYS = 14;
/** iOS keeps at most 64 pending notifications per app, so the soonest 64 are kept. */
export const MAX_PENDING = 64;
export const SNOOZE_MINUTES = 10;
/** Off until the person turns it on; 8:00 AM when they do. */
export const DEFAULT_MORNING_LIST: MorningList = { on: false, hour: 8, minute: 0 };

export const morningListOf = (prefs: Partial<Preferences> | null | undefined): MorningList => ({
  ...DEFAULT_MORNING_LIST,
  ...prefs?.reminders?.morningList,
});

export type ReminderKind = 'task' | 'due' | 'morning' | 'snooze';

export interface Reminder {
  /** What it's for and when: `task:<id>:<ms>`, `due:<id>:<ms>`, `morning:<day>`, `snooze:<id>:<ms>`. */
  id: string;
  kind: ReminderKind;
  /** Null for the morning list. */
  taskId: string | null;
  /** When it rings, epoch ms. */
  at: number;
  /** The day it's for: a repeat's occurrence, a deadline's day, the morning list's day. */
  day: LocalDate | null;
  title: string;
  /** Empty when there's nothing to add to the title. */
  body: string;
}

export interface ReminderOptions {
  /** Territories, for the words ("Every day · Home"). */
  lists?: List[];
  /** The morning list, when it's on. */
  morning?: MorningList | null;
  /** When the person's day ends: the morning list counts their day. */
  rolloverHour?: number;
  /** How many to keep, soonest first. */
  limit?: number;
}

const open = (t: Task) => !t.deletedAt && !t.completedAt;

/** The days a timed task rings on within the window: its day, or each time a repeat comes round. */
function ringDays(t: Task & { scheduledOn: LocalDate }, from: LocalDate, until: LocalDate): LocalDate[] {
  if (!t.rrule) return t.scheduledOn <= until ? [t.scheduledOn] : [];
  const days: LocalDate[] = [];
  let day = occurrenceOnOrAfter(t.rrule, t.scheduledOn, from > t.scheduledOn ? from : t.scheduledOn);
  while (day <= until) {
    days.push(day);
    const next = nextOccurrence(t.rrule, t.scheduledOn, day);
    if (next <= day) break;
    day = next;
  }
  return days;
}

/** Everything that should ring in the next two weeks, soonest first, up to `limit`. */
export function planReminders(tasks: Task[], now: Date, options: ReminderOptions = {}): Reminder[] {
  const { lists = [], morning = null, rolloverHour = 0, limit = MAX_PENDING } = options;
  const start = now.getTime();
  const end = start + REMINDER_DAYS * 86_400_000;
  const inWindow = (at: number) => at > start && at <= end;
  const firstDay = localDateString(now);
  const lastDay = localDateString(new Date(end));

  const live = tasks.filter((t) => !t.deletedAt);
  const byId = new Map(live.map((t) => [t.id, t]));
  const steps = stepsByParent(live);
  const listNames = new Map(lists.filter((l) => !l.deletedAt).map((l) => [l.id, l.name]));

  /** "History paper · step 2 of 10", then the territory. */
  const context = (t: Task): string[] => {
    const parts: string[] = [];
    const parent = t.parentId ? byId.get(t.parentId) : undefined;
    if (parent) {
      const siblings = steps.get(parent.id) ?? [t];
      parts.push(voice.reminders.step(parent.title, siblings.indexOf(t) + 1, siblings.length));
    }
    const listId = effectiveListId(t, byId);
    const territory = listId ? listNames.get(listId) : undefined;
    if (territory) parts.push(territory);
    return parts;
  };

  const planned: Reminder[] = [];
  for (const t of live) {
    if (!open(t)) continue;
    const where = context(t);
    const taskTimes = new Set<number>();
    if (t.scheduledOn && t.remindAt) {
      const { hour, minute } = clockOf(t.remindAt);
      const body = [t.rrule ? describeRRule(t.rrule) : null, ...where].filter(Boolean).join(' · ');
      for (const day of ringDays(t as Task & { scheduledOn: LocalDate }, firstDay, lastDay)) {
        const at = Date.parse(atLocalTime(day, hour, minute));
        if (!inWindow(at)) continue;
        taskTimes.add(at);
        planned.push({ id: `task:${t.id}:${at}`, kind: 'task', taskId: t.id, at, day, title: t.title, body });
      }
    }
    if (t.dueAt) {
      const at = Date.parse(t.dueAt);
      // Due at the very moment it's set for: one ring is enough.
      if (inWindow(at) && !taskTimes.has(at)) {
        planned.push({
          id: `due:${t.id}:${at}`,
          kind: 'due',
          taskId: t.id,
          at,
          day: t.dueOn ?? localDateString(new Date(at)),
          title: voice.reminders.due(t.title, formatTime(new Date(at))),
          body: where.join(' · '),
        });
      }
    }
  }

  if (morning?.on) {
    for (let day = firstDay; day <= lastDay; ) {
      const at = Date.parse(atLocalTime(day, morning.hour, morning.minute));
      if (inWindow(at)) {
        // What Today will show that morning if nothing changes before then.
        const view = buildToday(live, logicalDateString(new Date(at), rolloverHour), rolloverHour);
        const ahead = view.agenda.filter((e) => !e.done);
        const count = ahead.length + (view.nextStep ? 1 : 0) + (view.upNext ? 1 : 0);
        const first = view.nextStep ?? view.upNext ?? ahead[0];
        // Nothing on: no ring.
        if (first) {
          planned.push({
            id: `morning:${day}`,
            kind: 'morning',
            taskId: null,
            at,
            day,
            title: voice.reminders.morningTitle(count),
            body: voice.reminders.startWith(first.task.title),
          });
        }
      }
      day = addDays(day, 1);
    }
  }

  return planned.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)).slice(0, Math.max(0, limit));
}

/** The kind and task of one of our reminder ids; null for anyone else's (e.g. a future timer-end alert). */
export function parseReminderId(id: string): { kind: ReminderKind; taskId: string | null } | null {
  const [kind, taskId] = id.split(':');
  if (kind === 'morning') return { kind, taskId: null };
  if ((kind === 'task' || kind === 'due' || kind === 'snooze') && taskId) return { kind, taskId };
  return null;
}

/** Snooze: the same words again in 10 minutes. The task itself doesn't move. */
export function snoozeOf(r: Pick<Reminder, 'taskId' | 'day' | 'title' | 'body'>, now: Date): Reminder {
  const at = now.getTime() + SNOOZE_MINUTES * 60_000;
  return { id: `snooze:${r.taskId}:${at}`, kind: 'snooze', taskId: r.taskId, at, day: r.day, title: r.title, body: r.body };
}

/** A reminder the phone has pending, as far as reconciling cares. */
export interface PendingReminder {
  id: string;
  title: string;
  body: string;
}

export interface ReminderChanges {
  cancel: string[];
  add: Reminder[];
}

/**
 * What to change so the phone's pending reminders match the plan. A snooze
 * stays while its task is open; another feature's notifications are left
 * alone (they still count toward the 64). Ones whose words changed are
 * replaced.
 */
export function reminderChanges(pending: PendingReminder[], tasks: Task[], now: Date, options: ReminderOptions = {}): ReminderChanges {
  const openIds = new Set(tasks.filter(open).map((t) => t.id));
  const ours = pending.flatMap((p) => {
    const parsed = parseReminderId(p.id);
    return parsed ? [{ ...p, ...parsed }] : [];
  });
  const keptSnoozes = ours.filter((p) => p.kind === 'snooze' && p.taskId && openIds.has(p.taskId));
  // Everything else pending keeps its place in the 64.
  const others = pending.length - ours.length;

  const plan = planReminders(tasks, now, { ...options, limit: (options.limit ?? MAX_PENDING) - others - keptSnoozes.length });
  const planned = new Map(plan.map((r) => [r.id, r]));
  const have = new Map(ours.map((p) => [p.id, p]));
  const kept = new Set(keptSnoozes.map((p) => p.id));

  return {
    cancel: ours.filter((p) => !kept.has(p.id) && !planned.has(p.id)).map((p) => p.id),
    // Same id again replaces the pending one.
    add: plan.filter((r) => {
      const current = have.get(r.id);
      return !current || current.title !== r.title || (current.body ?? '') !== r.body;
    }),
  };
}
