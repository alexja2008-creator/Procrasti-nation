// Supabase access for notes. Everything runs as the signed-in user under RLS;
// deletes are soft, like tasks.
import type { Note, NoteCursor } from '@pn/core';

import { chunks, fetchAllPages } from '@/data/paging';
import { supabase } from '@/lib/supabase';

const COLUMNS = 'id,user_id,list_id,task_id,body,created_at,updated_at,deleted_at';

type Row = {
  id: string;
  user_id: string;
  list_id: string | null;
  task_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const fromRow = (r: Row): Note => ({
  id: r.id,
  userId: r.user_id,
  listId: r.list_id,
  taskId: r.task_id,
  body: r.body,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

/** Rows as the database sends them (search returns them too). */
export { fromRow as noteFromRow, type Row as NoteRow };

/** Which notes: every note, or one territory's (by id). */
export type NoteScope = 'all' | string;

/**
 * Up to `limit` notes, most recently edited first (ties by id), after `after`
 * when given: one page, or several on a refresh.
 */
export async function fetchNotePage(userId: string, scope: NoteScope, after: NoteCursor | null, limit: number): Promise<Note[]> {
  const rows = await fetchAllPages<Row>((from, to) => {
    let q = supabase.from('notes').select(COLUMNS).eq('user_id', userId).is('deleted_at', null);
    if (scope !== 'all') q = q.eq('list_id', scope);
    if (after) {
      const at = `"${after.updatedAt}"`;
      q = q.or(`updated_at.lt.${at},and(updated_at.eq.${at},id.lt.${after.id})`);
    }
    return q.order('updated_at', { ascending: false }).order('id', { ascending: false }).range(from, to).returns<Row[]>();
  }, limit);
  return rows.map(fromRow);
}

/** These notes, if they're still here (a checklist task's note, a note opened from a link). */
export async function fetchNotesByIds(ids: string[]): Promise<Note[]> {
  const pages = await Promise.all(
    chunks(ids).map((group) =>
      fetchAllPages<Row>((from, to) =>
        supabase.from('notes').select(COLUMNS).is('deleted_at', null).in('id', group).order('id').range(from, to).returns<Row[]>(),
      ),
    ),
  );
  return pages.flat().map(fromRow);
}

/** How many live notes each territory holds (the `null` key: notes without one). */
export async function fetchNoteCounts(): Promise<Map<string | null, number>> {
  const { data, error } = await supabase.from('note_counts').select('list_id,notes').returns<{ list_id: string | null; notes: number }[]>();
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.list_id, r.notes]));
}

/** Creates the note on its first save, updates it after (the id is made on the device). */
export async function saveNote(n: Pick<Note, 'id' | 'userId' | 'listId' | 'body'>): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .upsert({ id: n.id, user_id: n.userId, list_id: n.listId, body: n.body })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data as unknown as Row);
}

/** Soft delete (or, with null, restore) a note. */
export async function setNoteDeleted(id: string, deletedAt: string | null): Promise<void> {
  const { error } = await supabase.from('notes').update({ deleted_at: deletedAt }).eq('id', id);
  if (error) throw error;
}
