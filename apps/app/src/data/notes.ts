// Supabase access for notes. Everything runs as the signed-in user under RLS;
// deletes are soft, like tasks.
import type { Note } from '@pn/core';

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

export async function fetchNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select(COLUMNS)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data as unknown as Row[]).map(fromRow);
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
