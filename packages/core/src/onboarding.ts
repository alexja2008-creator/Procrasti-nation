// The Citizenship Application: the first-run questions, in order, and what
// each answer does. Every answer changes something real (territories, when
// the day ends, the morning list's time, Start Mode's timer, the plans' and
// Today's shape, the nudge tone), and Settings can change any of them later.

import { addDays, daysBetween } from './dates.ts';
import { voice } from './nation.ts';
import type { QuickAddResult } from './quick-add.ts';
import { morningListOf } from './reminders.ts';
import type { Hours, List, LocalDate, MorningList, Persona, Preferences, ProcrastinationStyle, Task } from './types.ts';

export type ApplicationPage =
  | 'welcome'
  | 'purpose'
  | 'hours'
  | 'style'
  | 'notBroken'
  | 'tone'
  | 'result'
  | 'help'
  | 'heardFrom'
  | 'oath'
  | 'firstWeek'
  | 'nudge'
  | 'approved'
  | 'save';

/**
 * In order. Up to Where did you hear about us, a new person is signed out (answers wait on the
 * device); the anonymous passport opens on the way to the Oath. Save your passport is for an
 * anonymous one only.
 */
export const APPLICATION_PAGES: readonly ApplicationPage[] = [
  'welcome',
  'purpose',
  'hours',
  'style',
  'notBroken',
  'tone',
  'result',
  'help',
  'heardFrom',
  'oath',
  'firstWeek',
  'nudge',
  'approved',
  'save',
];

/** "Page n of 9": the questions through the Oath. */
const NUMBERED: readonly ApplicationPage[] = APPLICATION_PAGES.slice(APPLICATION_PAGES.indexOf('purpose'), APPLICATION_PAGES.indexOf('oath') + 1);

/** "Page 2 of 5", or null for the unnumbered pages. */
export function pageNumber(page: ApplicationPage): { n: number; of: number } | null {
  const i = NUMBERED.indexOf(page);
  return i < 0 ? null : { n: i + 1, of: NUMBERED.length };
}

/**
 * Where to pick up: the first page not done yet, so leaving halfway (or the
 * app being closed) keeps what's answered. Nothing answered starts at Welcome;
 * the self-forgiveness page counts as seen once the next answer exists, and
 * the result once they've said where they heard about us.
 */
export function resumePage(prefs: Partial<Preferences>): ApplicationPage {
  if (!prefs.persona && !prefs.hours && !prefs.style && !prefs.nudgeTone) return 'welcome';
  if (!prefs.persona) return 'purpose';
  if (!prefs.hours) return 'hours';
  if (!prefs.style) return 'style';
  if (!prefs.nudgeTone) return 'notBroken';
  if (!prefs.heardFrom) return 'result';
  return 'oath';
}

/** Your result: the fact is about students for school, about adults otherwise. */
export const resultAudience = (persona?: Persona): 'students' | 'adults' => (persona === 'work' || persona === 'life' ? 'adults' : 'students');

export type HelpCard = 'planIt' | 'startMode' | 'focusedToday' | 'roughFirst' | 'stamps' | 'nudges';

/** How PN helps you: three cards, the one that answers what stops them first. */
export function helpCardsFor(style?: ProcrastinationStyle): HelpCard[] {
  switch (style) {
    case 'avoid':
      return ['startMode', 'nudges', 'planIt'];
    case 'perfectionist':
      return ['roughFirst', 'planIt', 'stamps'];
    case 'bored':
      return ['stamps', 'nudges', 'startMode'];
    default:
      return ['planIt', 'focusedToday', 'startMode'];
  }
}

/**
 * Your first week: the Oath's steps on their days, from today through the next six. Steps without
 * a day, or later than that, aren't shown (the plan itself has them all).
 */
export function firstWeekOf(tasks: Task[], planId: string, today: LocalDate): { day: LocalDate; steps: Task[] }[] {
  const byDay = new Map<LocalDate, Task[]>();
  const steps = tasks
    .filter((t) => t.parentId === planId && !t.deletedAt && t.scheduledOn)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  for (const step of steps) {
    const day = step.scheduledOn!;
    const ahead = daysBetween(today, day);
    if (ahead < 0 || ahead > 6) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), step]);
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, dayTasks]) => ({ day, steps: dayTasks }));
}

/** The territories a purpose of visit starts someone with (only when they have none). */
export function territoriesFor(persona: Persona): Pick<List, 'name' | 'kind' | 'ink'>[] {
  const [school, work, home] = voice.territories.starters;
  const picks = { school: [school], work: [work], both: [school, work], life: [home] }[persona];
  return picks.map((s) => ({ name: s.name, kind: s.kind, ink: s.ink }));
}

export type OathDue = 'today' | 'tomorrow' | 'week' | 'none';

/**
 * The Oath's task: what they typed, read like quick add (a date in the text,
 * "essay due fri", wins), else due when they picked.
 */
export function oathTask(parsed: QuickAddResult, due: OathDue, today: LocalDate): QuickAddResult {
  if (parsed.scheduledOn || parsed.dueOn) return parsed;
  const dueOn = { today, tomorrow: addDays(today, 1), week: addDays(today, 7), none: null }[due];
  return { ...parsed, dueOn };
}

/** When their day ends: a night owl's late night still counts as today (3 AM); everyone else, midnight. */
export const rolloverFor = (hours: Hours): number => (hours === 'night' ? 3 : 0);

/** The morning list's time for their hours (it stays off until they turn it on). */
export const morningTimeFor = (hours: Hours): Pick<MorningList, 'hour' | 'minute'> =>
  ({ early: { hour: 7, minute: 0 }, day: { hour: 8, minute: 0 }, night: { hour: 10, minute: 0 } })[hours];

/**
 * Everything an Hours answer changes (the Application and Settings alike):
 * when the day ends, and the morning list's time while it's still off (once
 * it's on, it keeps the time they chose).
 */
export function hoursChange(hours: Hours, prefs: Partial<Preferences>): { preferences: Partial<Preferences>; dayRolloverHour: number } {
  const morning = morningListOf(prefs);
  return {
    preferences: { hours, reminders: { ...prefs.reminders, morningList: morning.on ? morning : { ...morning, ...morningTimeFor(hours) } } },
    dayRolloverHour: rolloverFor(hours),
  };
}
