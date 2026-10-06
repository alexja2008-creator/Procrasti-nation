// Helpers around the AI Adherence Planner ("Plan it").

import { addDays, daysBetween } from './dates.ts';
import type { LocalDate } from './types.ts';

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

// Words that usually mean "this is bigger than one sitting".
const BIG_TASK = new RegExp(
  '\\b(' +
    [
      'essay', 'paper', 'report', 'project', 'presentation', 'thesis', 'dissertation', 'portfolio',
      'study', 'studying', 'exam', 'midterm', 'final', 'finals', 'test', 'quiz', 'lab', 'assignment', 'homework',
      'apply', 'application', 'applications', 'research', 'prepare', 'prep', 'plan', 'organi[sz]e',
      'move', 'moving', 'build', 'launch', 'write', 'revise', 'learn', 'practice', 'clean', 'declutter', 'taxes',
    ].join('|') +
    ')\\b',
  'i',
);

/**
 * Whether to offer "Plan it" on a task: it sounds big ("Study for orgo
 * midterm", "Clean my room") or is long enough to be vague. "Walk Biscuit"
 * and "Buy stamps" never get a patronizing breakdown offer.
 */
export function suggestsPlan(title: string): boolean {
  return BIG_TASK.test(title) || title.trim().split(/\s+/).length >= 6;
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
