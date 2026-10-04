// Supabase access for tasks (online for now; the PowerSync spike decides the
// offline layer). Everything runs as the signed-in user under RLS.
import type { Task } from '@pn/core';

import { supabase } from '@/lib/supabase';

const COLUMNS =
  'id,user_id,list_id,parent_id,title,notes,status,due_on,due_at,remind_at,rrule,estimate_minutes,' +
  'scheduled_on,sort_order,source,external_id,completed_at,created_at,updated_at,deleted_at';

type Row = {
  id: string;
  user_id: string;
  list_id: string | null;
  parent_id: string | null;
  title: string;
  notes: string | null;
  status: string | null;
  due_on: string | null;
  due_at: string | null;
  remind_at: string | null;
  rrule: string | null;
  estimate_minutes: number | null;
  scheduled_on: string | null;
  sort_order: number;
  source: Task['source'];
  external_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const fromRow = (r: Row): Task => ({
  id: r.id,
  userId: r.user_id,
  listId: r.list_id,
  parentId: r.parent_id,
  title: r.title,
  notes: r.notes,
  status: r.status === 'completed' ? 'completed' : 'in_progress',
  dueOn: r.due_on,
  dueAt: r.due_at,
  remindAt: r.remind_at,
  rrule: r.rrule,
  estimateMinutes: r.estimate_minutes,
  scheduledOn: r.scheduled_on,
  sortOrder: Number(r.sort_order),
  source: r.source,
  externalId: r.external_id,
  completedAt: r.completed_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

/** Open tasks plus anything finished since `since` (the start of the person's day). */
export async function fetchActiveTasks(userId: string, since: Date): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(COLUMNS)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .or(`completed_at.is.null,completed_at.gte.${since.toISOString()}`)
    .order('sort_order')
    .order('created_at')
    .limit(1000);
  if (error) throw error;
  return (data as unknown as Row[]).map(fromRow);
}

export type NewTask = Pick<Task, 'id' | 'userId' | 'title' | 'scheduledOn' | 'dueOn' | 'dueAt' | 'remindAt' | 'rrule' | 'sortOrder'>;

export async function insertTask(t: NewTask): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      id: t.id,
      user_id: t.userId,
      title: t.title,
      scheduled_on: t.scheduledOn,
      due_on: t.dueOn,
      due_at: t.dueAt,
      remind_at: t.remindAt,
      rrule: t.rrule,
      sort_order: t.sortOrder,
      source: 'self',
      status: 'in_progress',
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data as unknown as Row);
}

export type TaskPatch = Partial<Pick<Task, 'status' | 'completedAt' | 'scheduledOn' | 'remindAt' | 'dueOn'>>;

export async function updateTask(id: string, patch: TaskPatch): Promise<Task> {
  const row: Record<string, unknown> = {};
  if ('status' in patch) row.status = patch.status;
  if ('completedAt' in patch) row.completed_at = patch.completedAt;
  if ('scheduledOn' in patch) row.scheduled_on = patch.scheduledOn;
  if ('remindAt' in patch) row.remind_at = patch.remindAt;
  if ('dueOn' in patch) row.due_on = patch.dueOn;
  const { data, error } = await supabase.from('tasks').update(row).eq('id', id).select(COLUMNS).single();
  if (error) throw error;
  return fromRow(data as unknown as Row);
}

export type NewStep = Pick<Task, 'id' | 'userId' | 'parentId' | 'title' | 'notes' | 'estimateMinutes' | 'scheduledOn' | 'sortOrder'>;

/** Saves AI plan steps as child rows in one request. */
export async function insertSteps(steps: NewStep[]): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(
      steps.map((s) => ({
        id: s.id,
        user_id: s.userId,
        parent_id: s.parentId,
        title: s.title,
        notes: s.notes,
        estimate_minutes: s.estimateMinutes,
        scheduled_on: s.scheduledOn,
        sort_order: s.sortOrder,
        source: 'ai',
        status: 'in_progress',
      })),
    )
    .select(COLUMNS);
  if (error) throw error;
  return (data as unknown as Row[]).map(fromRow);
}
