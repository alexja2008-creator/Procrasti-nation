import { summarizeNote, voice, type Note } from '@pn/core';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { fetchNotes, saveNote, setNoteDeleted } from '@/data/notes';
import { useTasks } from '@/data/tasks-store';

const copy = voice.notes;

type Store = {
  /** Live notes, most recently edited first. */
  notes: Note[];
  status: 'loading' | 'ready' | 'error';
  /** Last failed save, shown with the notes. */
  error: string | null;
  refresh: () => void;
  /**
   * Saves a note, creating it on its first save. Shows at once; writes for
   * one note go out in order. A failed save keeps the text and says so.
   */
  save: (id: string, fields: Pick<Note, 'body' | 'listId'>) => void;
  /** Deletes a note, offering Undo (unless `quiet`: an emptied note going away). */
  remove: (note: Note, options?: { quiet?: boolean }) => void;
};

const Ctx = createContext<Store | null>(null);

/** The signed-in person's notes. Lives inside `TasksProvider` (its notices, and checklist tasks). */
export function NotesProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { tasks, notify, clearNotice } = useTasks();
  const [all, setAll] = useState<Note[]>([]);
  const [status, setStatus] = useState<Store['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const writes = useRef(new Map<string, Promise<unknown>>());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && setReloads((n) => n + 1));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchNotes(userId).then(
      (rows) => {
        if (cancelled) return;
        // Keep local copies of notes with writes still on the way.
        setAll((prev) => {
          const pending = prev.filter((n) => writes.current.has(n.id));
          return [...rows.filter((r) => !pending.some((p) => p.id === r.id)), ...pending];
        });
        setStatus('ready');
      },
      () => !cancelled && setStatus((s) => (s === 'ready' ? s : 'error')),
    );
    return () => {
      cancelled = true;
    };
  }, [userId, reloads]);

  const notes = useMemo(
    () => all.filter((n) => !n.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [all],
  );

  /** Runs `write` after this note's earlier writes, so they land in order. */
  const queue = <T,>(id: string, write: () => Promise<T>): Promise<T> => {
    const next = (writes.current.get(id) ?? Promise.resolve()).catch(() => undefined).then(write);
    writes.current.set(id, next);
    next.finally(() => writes.current.get(id) === next && writes.current.delete(id)).catch(() => undefined);
    return next;
  };

  const save: Store['save'] = (id, fields) => {
    const stamp = new Date().toISOString();
    setAll((prev) => {
      const existing = prev.find((n) => n.id === id);
      if (existing) return prev.map((n) => (n.id === id ? { ...n, ...fields, updatedAt: stamp } : n));
      return [...prev, { id, userId, taskId: null, ...fields, createdAt: stamp, updatedAt: stamp, deletedAt: null }];
    });
    queue(id, () => saveNote({ id, userId, ...fields })).then(
      (saved) => {
        // The text on screen may be newer than this write; take only the server's timestamps.
        setAll((prev) => prev.map((n) => (n.id === id ? { ...n, createdAt: saved.createdAt, updatedAt: saved.updatedAt } : n)));
        setError(null);
      },
      () => setError(copy.saveFailed),
    );
  };

  const remove: Store['remove'] = (note, { quiet = false } = {}) => {
    const stamp = new Date().toISOString();
    const mark = (deletedAt: string | null) => setAll((prev) => prev.map((n) => (n.id === note.id ? { ...n, deletedAt } : n)));
    mark(stamp);
    const deleting = queue(note.id, () => setNoteDeleted(note.id, stamp));
    deleting.catch(() => {
      mark(null);
      clearNotice();
      setError(copy.saveFailed);
    });
    if (quiet) return;
    const title = summarizeNote(note, new Map(tasks.map((t) => [t.id, t]))).title || copy.untitled;
    notify(copy.deleted(title), () => {
      mark(null);
      queue(note.id, () => setNoteDeleted(note.id, null)).catch(() => {
        mark(stamp);
        setError(copy.saveFailed);
      });
    });
  };

  const refresh = () => {
    setStatus('loading');
    setReloads((n) => n + 1);
  };

  return <Ctx.Provider value={{ notes, status, error, refresh, save, remove }}>{children}</Ctx.Provider>;
}

export function useNotes(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useNotes must be used inside <NotesProvider>');
  return store;
}
