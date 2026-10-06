// The Start Mode session in progress, remembered on this device so closing the
// app (or iOS ending it in the background, or a page reload) doesn't lose it.
// Reopening Start Mode on the same task soon after picks the same session back
// up; an older one is closed out as of the last moment the person was seen.
import type { StartClock, StartSession } from '@pn/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActiveStart {
  session: StartSession;
  clock: StartClock;
  tiny: string | null;
  keptGoing: boolean;
  /** Epoch ms of the last save, refreshed while the timer runs: when they were last here. */
  savedAt: number;
}

/** How long after the last sign of life a session can still be resumed. */
export const RESUME_WINDOW_MS = 30 * 60_000;

const keyFor = (userId: string) => `pn.start.active.${userId}`;

export async function loadActiveStart(userId: string): Promise<ActiveStart | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as ActiveStart) : null;
  } catch {
    return null;
  }
}

export function saveActiveStart(userId: string, active: Omit<ActiveStart, 'savedAt'>): void {
  AsyncStorage.setItem(keyFor(userId), JSON.stringify({ ...active, savedAt: Date.now() })).catch(() => undefined);
}

export function clearActiveStart(userId: string): void {
  AsyncStorage.removeItem(keyFor(userId)).catch(() => undefined);
}
