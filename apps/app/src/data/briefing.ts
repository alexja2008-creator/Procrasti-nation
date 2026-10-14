// The Morning Briefing's data: "Not now" on its card, on this device (the day
// it was put off, so the card comes back tomorrow if anything is still carried
// over), and yesterday's recap from the server.
import { addDays, parseLocalDate, type LocalDate } from '@pn/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

const keyFor = (userId: string) => `pn.briefing.not-now.${userId}`;

export async function loadPutOff(userId: string): Promise<LocalDate | null> {
  try {
    return await AsyncStorage.getItem(keyFor(userId));
  } catch {
    return null;
  }
}

export function savePutOff(userId: string, day: LocalDate): void {
  AsyncStorage.setItem(keyFor(userId), day).catch(() => undefined);
}

/** The card back (an Undo of Pick three, which rests it for the day). */
export function clearPutOff(userId: string): void {
  AsyncStorage.removeItem(keyFor(userId)).catch(() => undefined);
}

export type Recap = { finished: number; starts: number };

/** When a day of theirs begins: midnight, or their rollover hour (Day ends at 3 AM: their day starts at 3 AM). */
const dayStart = (day: LocalDate, rolloverHour: number) => {
  const d = parseLocalDate(day);
  d.setHours(rolloverHour, 0, 0, 0);
  return d.toISOString();
};

/**
 * Yesterday, counted: tasks and plan steps finished, and Start Mode starts. Counts only, no rows.
 * A repeat checked off leaves no record (it moves on to its next day), so it isn't counted.
 */
export async function fetchYesterday(userId: string, today: LocalDate, rolloverHour: number): Promise<Recap> {
  const from = dayStart(addDays(today, -1), rolloverHour);
  const until = dayStart(today, rolloverHour);
  const [finished, starts] = await Promise.all([
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('completed_at', from)
      .lt('completed_at', until),
    supabase
      .from('start_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('started_at', from)
      .lt('started_at', until),
  ]);
  if (finished.error) throw finished.error;
  if (starts.error) throw starts.error;
  return { finished: finished.count ?? 0, starts: starts.count ?? 0 };
}
