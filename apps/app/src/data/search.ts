// Search runs in the database (`search_items`, as the signed-in person under
// RLS): the app only keeps what's on the go, so finished tasks and older
// notes are found there. One request per group, a page at a time.
import { SEARCH_PAGE, type Note, type Task } from '@pn/core';

import { noteFromRow, type NoteRow } from '@/data/notes';
import { taskFromRow, type TaskRow } from '@/data/tasks';
import { supabase } from '@/lib/supabase';

export type Hit<T> = { item: T; snippet: string | null };
/** A task found, with where it lives: its plan's title, its note's title. */
export type TaskHit = Hit<Task> & { plan: string | null; note: string | null };
/** One group's results so far; `more` when there are further ones. */
export type HitPage<H> = { hits: H[]; more: boolean };

type Match<R> = { id: string; rank: number; snippet: string | null; item: R };

async function searchGroup<R>(words: string, kind: 'open' | 'done' | 'notes', listId: string | null, skip: number) {
  const { data, error } = await supabase.rpc('search_items', {
    query: words,
    kind,
    in_list: listId,
    max_rows: SEARCH_PAGE + 1,
    skip,
  });
  if (error) throw error;
  const rows = ((data ?? []) as Match<R>[]).sort((a, b) => b.rank - a.rank);
  return { rows: rows.slice(0, SEARCH_PAGE), more: rows.length > SEARCH_PAGE };
}

// Snippets keep the note's line breaks; one line reads better in a list.
const tidy = (snippet: string | null) => (snippet ? snippet.replace(/\s+/g, ' ').trim() : null);

/** Open or finished tasks (plan steps included) matching `words`, best first. */
export async function searchTasks(words: string, kind: 'open' | 'done', listId: string | null, skip = 0): Promise<HitPage<TaskHit>> {
  const { rows, more } = await searchGroup<TaskRow & { parent_title: string | null; note_title: string | null }>(words, kind, listId, skip);
  return {
    hits: rows.map((r) => ({
      item: taskFromRow(r.item),
      snippet: tidy(r.snippet),
      plan: r.item.parent_title,
      note: r.item.note_title?.trim() || null,
    })),
    more,
  };
}

/** Notes matching `words`, best first, each with a snippet of the match. */
export async function searchNotes(words: string, listId: string | null, skip = 0): Promise<HitPage<Hit<Note>>> {
  const { rows, more } = await searchGroup<NoteRow>(words, 'notes', listId, skip);
  return { hits: rows.map((r) => ({ item: noteFromRow(r.item), snippet: tidy(r.snippet) })), more };
}
