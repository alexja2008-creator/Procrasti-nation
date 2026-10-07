// The Citizenship Application: the first-run questions, in order, and what
// each answer does. Every answer changes something real (territories, when
// the day ends, the morning list's time, Start Mode's timer, the plans' and
// Today's shape, the nudge tone), and Settings can change any of them later.

import { voice } from './nation.ts';
import type { Hours, List, MorningList, Persona, Preferences } from './types.ts';

export type ApplicationPage = 'welcome' | 'purpose' | 'hours' | 'style' | 'notBroken' | 'tone' | 'approved';

/** In order. Welcome and Approved aren't numbered; the rest are "page n of 5". */
export const APPLICATION_PAGES: readonly ApplicationPage[] = ['welcome', 'purpose', 'hours', 'style', 'notBroken', 'tone', 'approved'];

const NUMBERED: readonly ApplicationPage[] = APPLICATION_PAGES.filter((p) => p !== 'welcome' && p !== 'approved');

/** "Page 2 of 5", or null for the unnumbered pages. */
export function pageNumber(page: ApplicationPage): { n: number; of: number } | null {
  const i = NUMBERED.indexOf(page);
  return i < 0 ? null : { n: i + 1, of: NUMBERED.length };
}

/**
 * Where to pick up: the first page not done yet, so leaving halfway (or the
 * app being closed) keeps what's answered. Nothing answered starts at Welcome;
 * the self-forgiveness page counts as seen once the next answer exists.
 */
export function resumePage(prefs: Partial<Preferences>): ApplicationPage {
  if (!prefs.persona && !prefs.hours && !prefs.style && !prefs.nudgeTone) return 'welcome';
  if (!prefs.persona) return 'purpose';
  if (!prefs.hours) return 'hours';
  if (!prefs.style) return 'style';
  if (!prefs.nudgeTone) return 'notBroken';
  return 'approved';
}

/** The territories a purpose of visit starts someone with (only when they have none). */
export function territoriesFor(persona: Persona): Pick<List, 'name' | 'kind' | 'ink'>[] {
  const [school, work, home] = voice.territories.starters;
  const picks = { school: [school], work: [work], both: [school, work], life: [home] }[persona];
  return picks.map((s) => ({ name: s.name, kind: s.kind, ink: s.ink }));
}

/** When their day ends: a night owl's late night still counts as today (3 AM); everyone else, midnight. */
export const rolloverFor = (hours: Hours): number => (hours === 'night' ? 3 : 0);

/** The morning list's time for their hours (it stays off until they turn it on). */
export const morningTimeFor = (hours: Hours): Pick<MorningList, 'hour' | 'minute'> =>
  ({ early: { hour: 7, minute: 0 }, day: { hour: 8, minute: 0 }, night: { hour: 10, minute: 0 } })[hours];
