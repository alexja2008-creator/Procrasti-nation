// Stamps: rewards for starting and finishing. Awarded on-device; milestone
// stamps (e.g. the first start) are unique per person in the database.
import { stampKinds } from '@pn/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchAllPages } from '@/data/paging';
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

/**
 * "Declaration kept": once per Declaration (the same task can be declared again another day),
 * so starting twice in the window, or resuming, earns it once. True when it was just earned.
 */
export async function awardDeclarationKept(userId: string, task: { id: string; declaredAt: string | null }, listId: string | null): Promise<boolean> {
  if (!task.declaredAt) return false;
  const { data, error } = await supabase
    .from('stamps')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', stampKinds.declarationKept)
    .eq('task_id', task.id)
    .gte('earned_at', task.declaredAt)
    .limit(1);
  if (error) throw error;
  if (data.length) return false;
  await awardStamp({ userId, kind: stampKinds.declarationKept, taskId: task.id, listId });
  return true;
}

/** "Application approved": once, and only for answering the Application (Skip earns nothing). */
export async function awardCitizenship(userId: string): Promise<void> {
  await awardStamp({ userId, kind: stampKinds.citizenship });
}

/** "Declaration signed": once, for the first Declaration ever (the database turns away the rest). */
export async function awardFirstDeclaration(userId: string): Promise<void> {
  await awardStamp({ userId, kind: stampKinds.firstDeclaration });
}

export interface PassportStamps {
  /** When the Citizenship Application was approved, if it was answered. */
  approvedAt: string | null;
  /** When the first Declaration was signed, if one has been. */
  firstDeclarationAt: string | null;
  /** When "Officially started" was earned, if it has been. */
  firstStartAt: string | null;
  /** Steps and tasks finished in Start Mode ("Small steps and counting"). */
  stepsDone: number;
}

export async function fetchPassportStamps(userId: string): Promise<PassportStamps> {
  const once = (kind: string) => supabase.from('stamps').select('earned_at').eq('user_id', userId).eq('kind', kind).maybeSingle();
  const [approved, declared, first, done] = await Promise.all([
    once(stampKinds.citizenship),
    once(stampKinds.firstDeclaration),
    once(stampKinds.firstStart),
    supabase.from('stamps').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', stampKinds.stepDone),
  ]);
  if (approved.error) throw approved.error;
  if (declared.error) throw declared.error;
  if (first.error) throw first.error;
  if (done.error) throw done.error;
  const at = (row: unknown) => (row as { earned_at: string } | null)?.earned_at ?? null;
  return { approvedAt: at(approved.data), firstDeclarationAt: at(declared.data), firstStartAt: at(first.data), stepsDone: done.count ?? 0 };
}

/** A kept Declaration for the Passport: when they started, and the task (null once it's deleted for good). */
export type KeptDeclaration = { id: string; earnedAt: string; title: string | null };

type KeptRow = { id: string; earned_at: string; task: { title: string } | null };

const KEPT_COLUMNS = 'id, earned_at, task:tasks(title)';
const fromKept = (r: KeptRow): KeptDeclaration => ({ id: r.id, earnedAt: r.earned_at, title: r.task?.title ?? null });

/** The latest `limit` Declarations kept, newest first, and how many there are in all. */
export async function fetchDeclarationsKept(userId: string, limit: number): Promise<{ count: number; latest: KeptDeclaration[] }> {
  const { data, count, error } = await supabase
    .from('stamps')
    .select(KEPT_COLUMNS, { count: 'exact' })
    .eq('user_id', userId)
    .eq('kind', stampKinds.declarationKept)
    .order('earned_at', { ascending: false })
    .order('id')
    .range(0, limit - 1)
    .returns<KeptRow[]>();
  if (error) throw error;
  return { count: count ?? 0, latest: (data ?? []).map(fromKept) };
}

/** Every Declaration kept, newest first (Show all). */
export async function fetchAllDeclarationsKept(userId: string): Promise<KeptDeclaration[]> {
  const rows = await fetchAllPages<KeptRow>((from, to) =>
    supabase
      .from('stamps')
      .select(KEPT_COLUMNS)
      .eq('user_id', userId)
      .eq('kind', stampKinds.declarationKept)
      .order('earned_at', { ascending: false })
      .order('id')
      .range(from, to)
      .returns<KeptRow[]>(),
  );
  return rows.map(fromKept);
}
