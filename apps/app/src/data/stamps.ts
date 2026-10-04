// Stamps: rewards for starting and finishing. Awarded on-device; milestone
// stamps (e.g. the first start) are unique per person in the database.
import { stampKinds } from '@pn/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

type Award = { userId: string; kind: string; taskId?: string | null; listId?: string | null };

/** 'already' when a once-only stamp was earned before (on any device). */
export async function awardStamp({ userId, kind, taskId = null, listId = null }: Award): Promise<'awarded' | 'already'> {
  const { error } = await supabase.from('stamps').insert({ user_id: userId, kind, task_id: taskId, list_id: listId });
  if (error?.code === '23505') return 'already';
  if (error) throw error;
  return 'awarded';
}

const firstStartKey = (userId: string) => `pn.stamped.first-start.${userId}`;

/**
 * Awards "Officially started" on the first Start ever. Remembers locally once
 * it's settled, so later starts on this device don't ask the database again.
 */
export async function awardFirstStart(userId: string): Promise<boolean> {
  try {
    if (await AsyncStorage.getItem(firstStartKey(userId))) return false;
  } catch {
    // storage unavailable: ask the database, which decides anyway
  }
  const result = await awardStamp({ userId, kind: stampKinds.firstStart });
  AsyncStorage.setItem(firstStartKey(userId), '1').catch(() => undefined);
  return result === 'awarded';
}

export interface PassportStamps {
  /** When "Officially started" was earned, if it has been. */
  firstStartAt: string | null;
  /** Steps and tasks finished in Start Mode ("Small steps and counting"). */
  stepsDone: number;
}

export async function fetchPassportStamps(userId: string): Promise<PassportStamps> {
  const [first, done] = await Promise.all([
    supabase.from('stamps').select('earned_at').eq('user_id', userId).eq('kind', stampKinds.firstStart).maybeSingle(),
    supabase.from('stamps').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', stampKinds.stepDone),
  ]);
  if (first.error) throw first.error;
  if (done.error) throw done.error;
  return { firstStartAt: (first.data as { earned_at: string } | null)?.earned_at ?? null, stepsDone: done.count ?? 0 };
}
