// The account as a whole: Download your data (built here, on the device, from the rows the
// person can already read), and Delete your passport (the site's route does the deleting).
import { buildExport, exportFileName, localDateString, type UserSettings } from '@pn/core';
import type { User } from '@supabase/supabase-js';

import { forgetDeletedAccount } from '@/auth/sign-out';
import { fetchLists } from '@/data/lists';
import { fetchEveryNote } from '@/data/notes';
import { fetchAllPages } from '@/data/paging';
import { fetchUsername } from '@/data/profile';
import { fetchEveryTask } from '@/data/tasks';
import { apiPost } from '@/lib/api';
import { saveFile } from '@/lib/save-file';
import { supabase } from '@/lib/supabase';

type StampRow = { kind: string; earned_at: string; task_id: string | null; list_id: string | null };
type StartRow = { task_id: string | null; started_at: string; ended_at: string | null; planned_minutes: number; outcome: string | null };
type PlanRow = { task_id: string | null; created_at: string };

/** Every row of a small table of theirs, oldest first (page by page, past the API's 1,000-row cap). */
const everyRow = <R>(table: string, columns: string, orderBy: string, userId: string) =>
  fetchAllPages<R>((from, to) =>
    supabase.from(table).select(columns).eq('user_id', userId).order(orderBy).order('id').range(from, to).returns<R[]>(),
  );

/** Builds their export and hands it over: a download on the web, the share sheet on iPhone. */
export async function downloadMyData(user: User, settings: UserSettings | null): Promise<void> {
  const [lists, tasks, notes, username, stamps, starts, plans] = await Promise.all([
    fetchLists(user.id),
    fetchEveryTask(user.id),
    fetchEveryNote(user.id),
    fetchUsername(user.id).catch(() => null),
    everyRow<StampRow>('stamps', 'id,kind,earned_at,task_id,list_id', 'earned_at', user.id),
    everyRow<StartRow>('start_sessions', 'id,task_id,started_at,ended_at,planned_minutes,outcome', 'started_at', user.id),
    everyRow<PlanRow>('plan_generations', 'id,task_id,created_at', 'created_at', user.id),
  ]);

  const exported = buildExport({
    exportedAt: new Date().toISOString(),
    account: {
      citizenNumber: settings?.citizenNumber ?? null,
      email: user.email || null,
      phone: user.phone ? `+${user.phone.replace(/^\+/, '')}` : null,
      createdAt: user.created_at ?? null,
      username,
    },
    settings,
    lists,
    tasks,
    notes,
    stamps: stamps.map((r) => ({ kind: r.kind, earnedAt: r.earned_at, taskId: r.task_id, listId: r.list_id })),
    starts: starts.map((r) => ({
      taskId: r.task_id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      plannedMinutes: r.planned_minutes,
      outcome: r.outcome,
    })),
    plans: plans.map((r) => ({ taskId: r.task_id, createdAt: r.created_at })),
  });

  await saveFile(exportFileName(localDateString()), JSON.stringify(exported, null, 2), 'application/json');
}

// Deleted in this run of the app: Welcome says so, kindly, once.
let deletedHere = false;
export const passportDeletedHere = () => deletedHere;

/**
 * Deletes their account and everything in it (the site's route; it cancels a Stripe subscription
 * first), then forgets this device. The session ends here, so the app goes back to Welcome.
 */
export async function deleteMyAccount(userId: string): Promise<void> {
  await apiPost<{ deleted: true }>('/api/account/delete', { confirm: 'DELETE' });
  deletedHere = true;
  await forgetDeletedAccount(userId);
}
