import type { ApplicationPage } from '@pn/core';
import { useRef, useState, type RefObject } from 'react';
import type { ScrollView } from 'react-native';

/** Long enough to see the pick land before the page turns. */
const TURN_MS = 260;
/**
 * A press that turns the page (Begin, Continue, Back) can land a second time
 * on whatever the new page has under the pointer (the browser's click follows
 * the press that already turned it), so answers wait this long after a turn.
 */
const SETTLE_MS = 400;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Turning the Application's pages, and saving an answer before turning (shared by signed out and signed in). */
export function useTurns(initial: ApplicationPage, scroll: RefObject<ScrollView | null>, saveFailed: string) {
  const [turnedTo, setPage] = useState<ApplicationPage>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const turnedAt = useRef(0);

  const go = (to: ApplicationPage) => {
    turnedAt.current = Date.now();
    setError(null);
    setPage(to);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  /** Not busy, and long enough since the last turn that this press is a new one. */
  const settled = () => !busy && Date.now() - turnedAt.current >= SETTLE_MS;

  /** Saves an answer, then runs `then` (turn the page); stays put, with a message, if the save fails. */
  const answer = async (save: () => Promise<unknown>, then: () => void) => {
    if (!settled()) return;
    setBusy(true);
    setError(null);
    try {
      await Promise.all([save(), pause(TURN_MS)]);
      then();
    } catch {
      setError(saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return { turnedTo, go, answer, settled, busy, setBusy, error, setError };
}
