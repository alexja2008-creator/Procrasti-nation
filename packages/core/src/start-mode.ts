// Start Mode: one step, a timer (the step's estimate, or a short start), and
// the "just N minutes" contract. Pure and shared so iOS, web and (later) the
// Live Activity agree. The clock is wall-clock based, so a backgrounded app or
// a throttled browser tab can't make it drift.

import type { Preferences, StartSession, Task } from './types.ts';

export type StartMinutes = Preferences['startMinutes'];

/** The person's own choice, else a default from what stops them. */
export function defaultStartMinutes(prefs: Partial<Preferences> | null | undefined): StartMinutes {
  if (prefs?.startMinutes) return prefs.startMinutes;
  switch (prefs?.style) {
    case 'overwhelmed':
      return 2; // the smallest possible commitment
    case 'perfectionist':
      return 10; // a short box with a clear stopping point
    case 'bored':
      return 25; // a proper timebox
    default:
      return 5;
  }
}

/** A plan's step after the first with no estimate (one added by hand): a proper timebox. */
export const STEP_MINUTES = 25;

/**
 * The longest timer. `start_sessions.planned_minutes` takes 1–180, and a session row that
 * can't be saved is a start that never counts (planner text like "2 hours (120 min)" reads as 240).
 */
export const MAX_TIMER_MINUTES = 180;

/**
 * How long Start Mode's timer runs (Alex, 2026-10-20): a plan's step counts down from its
 * estimate, the first step included (the planner keeps that one to a few minutes). With no
 * estimate, a first step gets the start timer and a later one STEP_MINUTES. A task that isn't a
 * step gets the start timer, whatever its estimate. `step` is its 1-based place in its plan.
 */
export function startMinutesFor(
  task: Pick<Task, 'estimateMinutes'> | null | undefined,
  step: { index: number } | null,
  prefs: Partial<Preferences> | null | undefined,
): number {
  if (!task || !step) return defaultStartMinutes(prefs);
  if (task.estimateMinutes) return Math.min(task.estimateMinutes, MAX_TIMER_MINUTES);
  return step.index > 1 ? STEP_MINUTES : defaultStartMinutes(prefs);
}

/** "I'm stuck" restarts the clock on a tiny first action. */
export const STUCK_MINUTES = 2;

export interface StartClock {
  /** Epoch ms when the session began. */
  startedAt: number;
  /** Total ms spent paused in finished pauses. */
  pausedMs: number;
  /** Epoch ms when the current pause began; null while running. */
  pausedAt: number | null;
}

export const startClock = (now: number): StartClock => ({ startedAt: now, pausedMs: 0, pausedAt: null });

export function pauseClock(clock: StartClock, now: number): StartClock {
  return clock.pausedAt === null ? { ...clock, pausedAt: now } : clock;
}

export function resumeClock(clock: StartClock, now: number): StartClock {
  if (clock.pausedAt === null) return clock;
  return { ...clock, pausedMs: clock.pausedMs + Math.max(0, now - clock.pausedAt), pausedAt: null };
}

/** Time actually spent working: wall time since the start, minus pauses. */
export function elapsedMs(clock: StartClock, now: number): number {
  const end = clock.pausedAt ?? now;
  return Math.max(0, end - clock.startedAt - clock.pausedMs);
}

/** 192_000 → "3:12"; 3_723_000 → "1:02:03". Rounds up, so a countdown shows 5:00 at the start. */
export function formatClock(ms: number, round: 'up' | 'down' = 'down'): string {
  const total = Math.max(0, round === 'up' ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** How a session ended when the person leaves without pressing Done. */
export function leftOutcome(elapsed: number, plannedMinutes: number): NonNullable<StartSession['outcome']> {
  return elapsed >= plannedMinutes * 60_000 ? 'kept-going' : 'stopped';
}

// ---------------------------------------------------------------------------
// Stamps

export const stampKinds = {
  /** The first Start ever: "Officially started". */
  firstStart: 'first-start',
  /** Done in Start Mode. */
  stepDone: 'task-done',
  /** The Citizenship Application, answered (not skipped). Once only. */
  citizenship: 'citizenship',
  /** The first Declaration signed (usually the Application's, on the Oath's first step). Once only. */
  firstDeclaration: 'first-declaration',
  /** Started within a Declaration's window. Once per Declaration (a task can be declared again). */
  declarationKept: 'declaration-kept',
} as const;

// ---------------------------------------------------------------------------
// "I'm stuck": what's in the way (one tap, then the AI makes the step smaller).

export type StuckReason = 'start' | 'big' | 'mood' | 'missing';

export const stuckReasons: { id: StuckReason; label: string }[] = [
  { id: 'start', label: 'I don’t know where to begin' },
  { id: 'big', label: 'It feels too big' },
  { id: 'mood', label: 'I’m not in the mood' },
  { id: 'missing', label: 'I’m missing something' },
];
