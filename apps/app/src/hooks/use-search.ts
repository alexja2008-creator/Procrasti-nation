import { hasSearchWords, type Note } from '@pn/core';
import { useEffect, useEffectEvent, useState } from 'react';

import { searchNotes, searchTasks, type Hit, type HitPage, type TaskHit } from '@/data/search';
import { useTasks } from '@/data/tasks-store';

/** Pause after the last keystroke before searching. */
const PAUSE_MS = 250;

type Groups = { open: HitPage<TaskHit>; done: HitPage<TaskHit>; notes: HitPage<Hit<Note>> };
export type SearchGroup = keyof Groups;

export type SearchState = Groups & {
  /** Nothing typed yet (or only punctuation). */
  idle: boolean;
  /** Waiting on the answer for what's typed now (the last answer stays up meanwhile). */
  searching: boolean;
  failed: boolean;
  /** A group loading its next page. */
  loadingMore: SearchGroup | null;
  showMore: (group: SearchGroup) => void;
  retry: () => void;
};

const none = <H,>(): HitPage<H> => ({ hits: [], more: false });

/**
 * Searches as the person types: open tasks, finished tasks and notes, a
 * page each, after a short pause. An answer for older text is dropped.
 * Tasks found are added to the task store so they can be checked off.
 */
export function useSearch(words: string, listId: string | null): SearchState {
  const { include, loadNoteLines } = useTasks();
  const key = `${listId ?? ''}|${words}`;
  const [answer, setAnswer] = useState<(Groups & { key: string; failed: boolean }) | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState<SearchGroup | null>(null);
  const idle = !hasSearchWords(words);

  // Tasks found join the task store (to check them off); notes found load their checklist lines.
  const found = (tasks: TaskHit[], notes: Hit<Note>[]) => {
    include(tasks.map((h) => h.item));
    loadNoteLines(notes.map((h) => h.item.id));
  };
  const onAnswer = useEffectEvent((groups: Groups, failed: boolean) => {
    if (!failed) found([...groups.open.hits, ...groups.done.hits], groups.notes.hits);
    setAnswer({ key: `${listId ?? ''}|${words}`, ...groups, failed });
  });

  useEffect(() => {
    if (!hasSearchWords(words)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      Promise.all([searchTasks(words, 'open', listId), searchTasks(words, 'done', listId), searchNotes(words, listId)]).then(
        ([open, done, notes]) => !cancelled && onAnswer({ open, done, notes }, false),
        () => !cancelled && onAnswer({ open: none(), done: none(), notes: none() }, true),
      );
    }, PAUSE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [words, listId, attempt]);

  const showMore = (group: SearchGroup) => {
    if (!answer || answer.key !== key || loadingMore) return;
    const skip = answer[group].hits.length;
    setLoadingMore(group);
    const next =
      group === 'notes'
        ? searchNotes(words, listId, skip).then((page) => {
            found([], page.hits);
            return page;
          })
        : searchTasks(words, group, listId, skip).then((page) => {
            found(page.hits, []);
            return page;
          });
    next.then(
      (page) => {
        setAnswer((prev) => {
          if (!prev || prev.key !== key) return prev;
          const seen = new Set(prev[group].hits.map((h) => h.item.id));
          const merged = { hits: [...prev[group].hits, ...page.hits.filter((h) => !seen.has(h.item.id))], more: page.more };
          return { ...prev, [group]: merged };
        });
        setLoadingMore(null);
      },
      () => setLoadingMore(null),
    );
  };

  const shown = answer ?? { open: none<TaskHit>(), done: none<TaskHit>(), notes: none<Hit<Note>>(), failed: false, key: '' };
  return {
    open: shown.open,
    done: shown.done,
    notes: shown.notes,
    idle,
    searching: !idle && answer?.key !== key,
    failed: !idle && answer?.key === key && answer.failed,
    loadingMore,
    showMore,
    retry: () => setAttempt((n) => n + 1),
  };
}
