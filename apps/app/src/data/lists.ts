// Supabase access for territories (the `lists` table). Everything runs as the
// signed-in user under RLS; deletes are soft, like tasks.
import type { List } from '@pn/core';

import { supabase } from '@/lib/supabase';

const COLUMNS = 'id,user_id,name,kind,ink,sort_order,created_at,updated_at,deleted_at';

type Row = {
  id: string;
  user_id: string;
  name: string;
  kind: List['kind'];
  ink: List['ink'];
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const fromRow = (r: Row): List => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  kind: r.kind,
  ink: r.ink,
  sortOrder: Number(r.sort_order),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

export async function fetchLists(userId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select(COLUMNS)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('sort_order')
    .order('created_at');
  if (error) throw error;
  return (data as unknown as Row[]).map(fromRow);
}

export type NewList = Pick<List, 'id' | 'userId' | 'name' | 'kind' | 'ink' | 'sortOrder'>;

export async function insertList(l: NewList): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .insert({ id: l.id, user_id: l.userId, name: l.name, kind: l.kind, ink: l.ink, sort_order: l.sortOrder })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data as unknown as Row);
}

export type ListPatch = Partial<Pick<List, 'name' | 'kind' | 'ink' | 'sortOrder'>>;

export async function updateList(id: string, patch: ListPatch): Promise<List> {
  const row: Record<string, unknown> = {};
  if ('name' in patch) row.name = patch.name;
  if ('kind' in patch) row.kind = patch.kind;
  if ('ink' in patch) row.ink = patch.ink;
  if ('sortOrder' in patch) row.sort_order = patch.sortOrder;
  const { data, error } = await supabase.from('lists').update(row).eq('id', id).select(COLUMNS).single();
  if (error) throw error;
  return fromRow(data as unknown as Row);
}

/** Soft delete (or, with null, restore) a territory. */
export async function setListDeleted(id: string, deletedAt: string | null): Promise<void> {
  const { error } = await supabase.from('lists').update({ deleted_at: deletedAt }).eq('id', id);
  if (error) throw error;
}
