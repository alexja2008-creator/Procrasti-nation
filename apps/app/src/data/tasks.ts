// Supabase access for tasks (online for now; the PowerSync spike decides the
// offline layer). Everything runs as the signed-in user under RLS.
import type { Task } from '@pn/core';

import { chunks, fetchAllPages } from '@/data/paging';
import { supabase } from '@/lib/supabase';

const COLUMNS =
  'id,user_id,list_id,parent_id,note_id,title,notes,status,due_on,due_at,remind_at,rrule,estimate_minutes,' +
  'scheduled_on,sort_order,source,external_id,completed_at,created_at,updated_at,deleted_at';

type Row = {
  id: string;
  user_id: string;
  list_id: string | null;
  parent_id: string | null;
  note_id: string | null;
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
  noteId: r.note_id,
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

/**
 * Open tasks plus anything finished since `since` (the start of the person's
 * day), plus every finished step of the plans among them, so "step 4 of 10"
 * still counts the steps done on earlier days. A note's ticked checklist lines
 * aren't here: they load with their note (`fetchNoteTasks`), so this stays the
 * size of what's on the go however many notes pile up.
 */
export async function fetchActiveTasks(userId: string, since: Date): Promise<Task[]> {
  const active = (
    await fetchAllPages<Row>((from, to) =>
      supabase
        .from('tasks')
        .select(COLUMNS)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .or(`completed_at.is.null,completed_at.gte.${since.toISOString()}`)
        .order('sort_order')
        .order('created_at')
        .order('id')
        .range(from, to)
        .returns<Row[]>(),
    )
  ).map(fromRow);

  const parentIds = [...new Set(active.flatMap((t) => (t.parentId ? [t.parentId] : [])))];
  const done = await Promise.all(
    chunks(parentIds).map((ids) =>
      fetchAllPages<Row>((from, to) =>
        supabase
          .from('tasks')
          .select(COLUMNS)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .in('parent_id', ids)
          .lt('completed_at', since.toISOString())
          .order('id')
          .range(from, to)
          .returns<Row[]>(),
      ),
    ),
  );
  return [...active, ...done.flat().map(fromRow)];
}

/** Every live checklist line (ticked or not) of these notes. */
export async function fetchNoteTasks(noteIds: string[]): Promise<Task[]> {
  const pages = await Promise.all(
    chunks(noteIds).map((ids) =>
      fetchAllPages<Row>((from, to) =>
        supabase.from('tasks').select(COLUMNS).is('deleted_at', null).in('note_id', ids).order('id').range(from, to).returns<Row[]>(),
      ),
    ),
  );
  return pages.flat().map(fromRow);
}

export type NewTask = Pick<
  Task,
  'id' | 'userId' | 'listId' | 'parentId' | 'noteId' | 'title' | 'scheduledOn' | 'dueOn' | 'dueAt' | 'remindAt' | 'rrule' | 'sortOrder'
>;

export async function insertTask(t: NewTask): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      id: t.id,
      user_id: t.userId,
      list_id: t.listId,
      parent_id: t.parentId,
      note_id: t.noteId,
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

/** Every field the app edits, camelCase → column. */
const PATCH_COLUMNS = {
  title: 'title',
  notes: 'notes',
  status: 'status',
  completedAt: 'completed_at',
  scheduledOn: 'scheduled_on',
  remindAt: 'remind_at',
  dueOn: 'due_on',
  dueAt: 'due_at',
  rrule: 'rrule',
  estimateMinutes: 'estimate_minutes',
  sortOrder: 'sort_order',
  listId: 'list_id',
} as const;

export type TaskPatch = Partial<Pick<Task, keyof typeof PATCH_COLUMNS>>;

export async function updateTask(id: string, patch: TaskPatch): Promise<Task> {
  const row: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(PATCH_COLUMNS)) {
    if (key in patch) row[column] = patch[key as keyof TaskPatch];
  }
  const { data, error } = await supabase.from('tasks').update(row).eq('id', id).select(COLUMNS).single();
  if (error) throw error;
  return fromRow(data as unknown as Row);
}

/** Takes every task out of a territory (for deleting it); returns their ids, for Undo. */
export async function unfileTasks(listId: string): Promise<string[]> {
  const { data, error } = await supabase.from('tasks').update({ list_id: null }).eq('list_id', listId).select('id');
  if (error) throw error;
  return (data as { id: string }[]).map((r) => r.id);
}

/** A note's checklist lines follow it to another territory (or none). */
export async function fileNoteTasks(noteId: string, listId: string | null): Promise<void> {
  const { error } = await supabase.from('tasks').update({ list_id: listId }).eq('note_id', noteId);
  if (error) throw error;
}

/** Files tasks in a territory again (Undo after deleting it). */
export async function refileTasks(ids: string[], listId: string): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('tasks').update({ list_id: listId }).in('id', ids);
  if (error) throw error;
}

/** Soft delete (or, with null, restore) tasks; sync needs the tombstones. */
export async function setDeleted(ids: string[], deletedAt: string | null): Promise<void> {
  const { error } = await supabase.from('tasks').update({ deleted_at: deletedAt }).in('id', ids);
  if (error) throw error;
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
