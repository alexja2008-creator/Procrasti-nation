// Start Mode: one step, a timer, and the "just N minutes" contract. Pure and
// shared so iOS, web and (later) the Live Activity agree. The clock is
// wall-clock based, so a backgrounded app or a throttled browser tab can't
// make it drift.

import type { Preferences, StartSession } from './types.ts';

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
