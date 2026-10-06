import { elapsedMs, leftOutcome, STUCK_MINUTES, type StartSession } from '@pn/core';
import * as Crypto from 'expo-crypto';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { clearActiveStart, loadActiveStart, RESUME_WINDOW_MS, saveActiveStart, type ActiveStart } from '@/data/active-start';
import { awardFirstStart } from '@/data/stamps';
import { sessionWriter } from '@/data/starts';
import { useStartTimer } from '@/hooks/use-start-timer';

type Outcome = NonNullable<StartSession['outcome']>;

/**
 * One Start Mode visit: the clock, the `start_sessions` rows behind it, and
 * the device's memory of it. Opening is the Start, unless it picks up a
 * session this device left running (the app was closed, or the page
 * reloaded). Waits for `taskId` when the screen was opened by URL.
 */
export function useStartSession({ userId, taskId, defaultMinutes }: { userId: string; taskId?: string; defaultMinutes: number }) {
  const timer = useStartTimer();
  const [planned, setPlanned] = useState(defaultMinutes);
  const [keptGoing, setKeptGoing] = useState(false);
  /** "First, just this": the two-minute action from "I'm stuck". */
  const [tiny, setTiny] = useState<string | null>(null);
  const [firstStart, setFirstStart] = useState(false);

  const [save] = useState(sessionWriter);
  const current = useRef<StartSession | null>(null);

  // Keep the screen on. Browsers may refuse the wake lock (hidden tab, permissions), so both calls swallow errors.
  useEffect(() => {
    if (!taskId) return;
    const tag = `start-${taskId}`;
    activateKeepAwakeAsync(tag).catch(() => undefined);
    return () => {
      deactivateKeepAwake(tag).catch(() => undefined);
    };
  }, [taskId]);

  const begin = (id: string, minutes: number) => {
    current.current = {
      id: Crypto.randomUUID(),
      userId,
      taskId: id,
      startedAt: new Date().toISOString(),
      endedAt: null,
      plannedMinutes: minutes,
      outcome: null,
    };
    save(current.current);
    timer.restart();
  };

  const end = (outcome: Outcome) => {
    const row = current.current;
    if (!row || row.endedAt) return;
    current.current = { ...row, endedAt: new Date().toISOString(), outcome };
    save(current.current);
  };

  const opened = useRef(false);
  const onFirstSight = useEffectEvent((id: string, prior: ActiveStart | null) => {
    if (prior && !prior.session.endedAt) {
      if (prior.session.taskId === id && Date.now() - prior.savedAt < RESUME_WINDOW_MS) {
        current.current = prior.session;
        timer.restore(prior.clock);
        setPlanned(prior.session.plannedMinutes);
        setTiny(prior.tiny);
        setKeptGoing(prior.keptGoing);
        return;
      }
      // Close out the one left behind, as of the last moment they were seen.
      save({
        ...prior.session,
        endedAt: new Date(Math.max(prior.savedAt, Date.parse(prior.session.startedAt))).toISOString(),
        outcome: leftOutcome(elapsedMs(prior.clock, prior.savedAt), prior.session.plannedMinutes),
      });
    }
    begin(id, planned);
    awardFirstStart(userId).then(setFirstStart, () => undefined);
  });
  useEffect(() => {
    if (!taskId || opened.current) return;
    opened.current = true;
    loadActiveStart(userId).then((prior) => onFirstSight(taskId, prior));
  }, [taskId, userId]);

  // Remember the session in progress: on every change, and every 30s while the clock runs.
  const heartbeat = Math.floor(timer.elapsed / 30_000);
  useEffect(() => {
    const row = current.current;
    if (!row || row.endedAt) return;
    saveActiveStart(userId, { session: row, clock: timer.clock, tiny, keptGoing });
  }, [userId, timer.clock, tiny, keptGoing, heartbeat]);

  /** Leaving without Done: "stopped", or "kept going" past the timer. */
  const leave = () => {
    const row = current.current;
    if (row) end(leftOutcome(timer.elapsedNow(), row.plannedMinutes));
    clearActiveStart(userId);
  };

  // Leaving another way (browser back, a gesture) still ends the session. Deferred
  // and checked against a ref, so a development double-mount doesn't end it on the spot.
  const mounted = useRef(false);
  const onUnmount = useEffectEvent(leave);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setTimeout(() => {
        if (!mounted.current) onUnmount();
      }, 0);
    };
  }, []);

  return {
    timer,
    planned,
    keptGoing,
    tiny,
    /** True once this visit earned "Officially started". */
    firstStart,
    leave,
    keepGoing: () => setKeptGoing(true),
    done: () => {
      end('done');
      clearActiveStart(userId);
    },
    /** "I'm stuck" → a fresh two-minute session on one tiny action. */
    startTiny: (action: string) => {
      if (!taskId) return;
      end('stuck');
      setTiny(action);
      setPlanned(STUCK_MINUTES);
      setKeptGoing(false);
      begin(taskId, STUCK_MINUTES);
    },
  };
}
