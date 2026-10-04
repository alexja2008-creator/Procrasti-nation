import { elapsedMs, pauseClock, resumeClock, startClock, type StartClock } from '@pn/core';
import { useEffect, useRef, useState } from 'react';

/**
 * Start Mode's clock. Wall-clock based (see @pn/core start-mode), re-rendering
 * a few times a second while it runs, so the display stays right after the
 * app was in the background.
 */
export function useStartTimer() {
  const [clock, setClock] = useState<StartClock>(() => startClock(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const latest = useRef(clock);
  const running = clock.pausedAt === null;

  useEffect(() => {
    latest.current = clock;
  }, [clock]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [running]);

  // Each change also refreshes `now`, so the display never shows a stale tick.
  const change = (next: (clock: StartClock, at: number) => StartClock) => {
    const at = Date.now();
    setClock((c) => next(c, at));
    setNow(at);
  };

  return {
    elapsed: elapsedMs(clock, now),
    paused: !running,
    pause: () => change(pauseClock),
    resume: () => change(resumeClock),
    restart: () => change((_, at) => startClock(at)),
    /** Elapsed right now, for event handlers and unmount (not for rendering). */
    elapsedNow: () => elapsedMs(latest.current, Date.now()),
  };
}
