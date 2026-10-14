import { NOTES_PAGE, byRecency, checklistIds, summarizeNote, voice, withinPages, type Note, type NoteCursor } from '@pn/core';
import { createContext, useContext, useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { fetchNoteCounts, fetchNotePage, fetchNotesByIds, saveNote, setNoteDeleted, type NoteScope } from '@/data/notes';
import { useTasks } from '@/data/tasks-store';

const copy = voice.notes;

export type { NoteScope };

/** How far a scope's notes are loaded: up to `end`, with `more` older ones on the server. */
type Pages = { end: NoteCursor | null; more: boolean; status: 'loading' | 'ready' | 'error' };

/** A scope's notes as loaded so far. */
export type NotePages = { notes: Note[]; more: boolean; status: Pages['status']; showOlder: () => void };

type Store = {
  /**
   * Every note loaded: the pages opened so far, plus any note a checklist
   * task on Today points to. Most recently edited first.
   */
  notes: Note[];
  /** Counts loaded (the Territories tab's numbers). */
  status: 'loading' | 'ready' | 'error';
  /** Last failed save, shown with the notes. */
  error: string | null;
  refresh: () => void;
  /** How many live notes there are: all of them, or a territory's (null: without one). */
  count: (listId?: string | null) => number;
  /** Starts loading a scope's notes, a page at a time (once; later calls do nothing). */
  open: (scope: NoteScope) => void;
  /** A scope's notes so far, with the next page on request. */
  pages: (scope: NoteScope) => NotePages;
  /** Loads one note that isn't here yet (opened from a link); resolves whether it exists. */
  ensure: (id: string) => Promise<boolean>;
  /**
   * Saves a note, creating it on its first save. Shows at once; writes for
   * one note go out in order (the promise settles when this one lands). A
   * failed save keeps the text and says so. Moving territory moves its
   * checklist lines too.
   */
  save: (id: string, fields: Pick<Note, 'body' | 'listId'>) => Promise<void>;
  /**
   * Deletes a note and its checklist lines' tasks, offering Undo for both
   * (unless `quiet`: an emptied note going away).
   */
  remove: (note: Note, options?: { quiet?: boolean }) => void;
};

const Ctx = createContext<Store | null>(null);

const inScope = (n: Note, scope: NoteScope) => scope === 'all' || n.listId === scope;
const cursorOf = (rows: Note[]): NoteCursor | null => {
  const last = rows.at(-1);
  return last ? { updatedAt: last.updatedAt, id: last.id } : null;
};
/** The notes of a scope within its loaded pages. */
const pageNotes = (notes: Note[], scope: NoteScope, p: Pages) =>
  notes.filter((n) => inScope(n, scope) && withinPages(n, p.more ? p.end : null));

/**
 * The signed-in person's notes, loaded 25 at a time per scope (every note,
 * or one territory's), so opening the app costs the same however many notes
 * pile up. Counts come from the server. Lives inside `TasksProvider` (its
 * notices, and checklist tasks).
 */
export function NotesProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { tasks, notify, clearNotice, setDeletedMany, fileNote, loadNoteLines } = useTasks();
  const [all, setAll] = useState<Note[]>([]);
  const [scopes, setScopes] = useState<Record<NoteScope, Pages>>({});
  const [counts, setCounts] = useState<Map<string | null, number>>(new Map());
  const [status, setStatus] = useState<Store['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const writes = useRef(new Map<string, Promise<unknown>>());
  // Scopes whose first page has been asked for.
  const opened = useRef(new Set<NoteScope>());
  // Notes asked for by id (a checklist task's note), so each is fetched once.
  const asked = useRef(new Set<string>());
  // Notes created on this device, counted the moment they're first saved.
  const created = useRef(new Set<string>());
  // Bumped by each refresh: an older one's answer is ignored.
  const generation = useRef(0);

  const notes = useMemo(() => all.filter((n) => !n.deletedAt).sort(byRecency), [all]);
  const ids = useMemo(() => new Set(all.map((n) => n.id)), [all]);

  /** Adds or replaces notes from the server (not ones with a write on its way) and loads their checklist lines. */
  const merge = (rows: Note[]) => {
    setAll((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      for (const r of rows) if (!writes.current.has(r.id)) byId.set(r.id, r);
      return [...byId.values()];
    });
    loadNoteLines(rows.map((r) => r.id));
  };
  const bump = (listId: string | null, by: number) =>
    setCounts((prev) => new Map(prev).set(listId, Math.max(0, (prev.get(listId) ?? 0) + by)));
  const recount = () => fetchNoteCounts().then(setCounts, () => undefined);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && setReloads((n) => n + 1));
    return () => sub.remove();
  }, []);

  // Counts, and every scope opened so far again, as deep as it was (notes
  // deleted or moved elsewhere drop out; new ones come in).
  const reload = useEffectEvent(() => {
    const gen = ++generation.current;
    const live = all.filter((n) => !n.deletedAt);
    const shown = Object.entries(scopes);
    const depth = (scope: NoteScope, p: Pages) => Math.max(NOTES_PAGE, pageNotes(live, scope, p).length);
    const covered = new Set(shown.flatMap(([scope, p]) => pageNotes(live, scope, p).map((n) => n.id)));
    const others = live.filter((n) => !covered.has(n.id)).map((n) => n.id);
    const before = new Set(all.map((n) => n.id));
    Promise.all([
      fetchNoteCounts(),
      Promise.all(
        shown.map(([scope, p]) => {
          const limit = depth(scope, p);
          return fetchNotePage(userId, scope, null, limit).then((rows) => ({ scope, rows, limit }));
        }),
      ),
      others.length ? fetchNotesByIds(others) : Promise.resolve([]),
    ]).then(
      ([fresh, pages, rest]) => {
        if (gen !== generation.current) return;
        setCounts(fresh);
        setScopes((prev) => {
          const next = { ...prev };
          for (const { scope, rows, limit } of pages) next[scope] = { end: cursorOf(rows), more: rows.length === limit, status: 'ready' };
          return next;
        });
        const fetched = new Map([...pages.flatMap((p) => p.rows), ...rest].map((n) => [n.id, n]));
        setAll((prev) => {
          const next = new Map<string, Note>();
          // Kept as they are: notes that came in while this was on its way, notes deleted here
          // (Undo may bring them back), and notes with writes still going out.
          for (const n of prev) if (!before.has(n.id) || n.deletedAt || writes.current.has(n.id)) next.set(n.id, n);
          for (const n of fetched.values()) if (!next.has(n.id)) next.set(n.id, n);
          return [...next.values()];
        });
        loadNoteLines([...fetched.keys()]);
        setStatus('ready');
      },
      () => gen === generation.current && setStatus((s) => (s === 'ready' ? s : 'error')),
    );
  });
  useEffect(() => reload(), [userId, reloads]);

  // A checklist task on Today names its note, which may be older than any page loaded.
  const fetchMissing = useEffectEvent((missing: string[]) => {
    missing.forEach((id) => asked.current.add(id));
    fetchNotesByIds(missing).then(merge, () => missing.forEach((id) => asked.current.delete(id)));
  });
  useEffect(() => {
    const missing = [...new Set(tasks.flatMap((t) => (t.noteId && !t.deletedAt ? [t.noteId] : [])))].filter(
      (id) => !ids.has(id) && !asked.current.has(id),
    );
    if (missing.length) fetchMissing(missing);
  }, [tasks, ids]);

  const open: Store['open'] = (scope) => {
    if (opened.current.has(scope)) return;
    opened.current.add(scope);
    setScopes((prev) => ({ ...prev, [scope]: { end: null, more: false, status: 'loading' } }));
    fetchNotePage(userId, scope, null, NOTES_PAGE).then(
      (rows) => {
        merge(rows);
        setScopes((prev) => ({ ...prev, [scope]: { end: cursorOf(rows), more: rows.length === NOTES_PAGE, status: 'ready' } }));
      },
      () => {
        opened.current.delete(scope);
        setScopes((prev) => ({ ...prev, [scope]: { end: null, more: false, status: 'error' } }));
      },
    );
  };

  const showOlder = (scope: NoteScope) => {
    const p = scopes[scope];
    if (!p?.more || p.status === 'loading') return;
    setScopes((prev) => ({ ...prev, [scope]: { ...p, status: 'loading' } }));
    fetchNotePage(userId, scope, p.end, NOTES_PAGE).then(
      (rows) => {
        merge(rows);
        setScopes((prev) => ({ ...prev, [scope]: { end: cursorOf(rows) ?? p.end, more: rows.length === NOTES_PAGE, status: 'ready' } }));
      },
      () => {
        setScopes((prev) => ({ ...prev, [scope]: { ...p, status: 'ready' } }));
        setError(copy.loadFailed);
      },
    );
  };

  const pages: Store['pages'] = (scope) => {
    const p = scopes[scope] ?? { end: null, more: false, status: 'loading' };
    return { notes: pageNotes(notes, scope, p), more: p.more, status: p.status, showOlder: () => showOlder(scope) };
  };

  const ensure: Store['ensure'] = async (id) => {
    if (ids.has(id)) return true;
    const rows = await fetchNotesByIds([id]);
    merge(rows);
    return rows.length > 0;
  };

  const count: Store['count'] = (listId) =>
    listId === undefined ? [...counts.values()].reduce((a, b) => a + b, 0) : (counts.get(listId) ?? 0);

  /** Runs `write` after this note's earlier writes, so they land in order. */
  const queue = <T,>(id: string, write: () => Promise<T>): Promise<T> => {
    const next = (writes.current.get(id) ?? Promise.resolve()).catch(() => undefined).then(write);
    writes.current.set(id, next);
    next.finally(() => writes.current.get(id) === next && writes.current.delete(id)).catch(() => undefined);
    return next;
  };

  const save: Store['save'] = (id, fields) => {
    const stamp = new Date().toISOString();
    const before = all.find((n) => n.id === id);
    if (before && before.listId !== fields.listId) {
      fileNote(id, fields.listId);
      bump(before.listId, -1);
      bump(fields.listId, 1);
    }
    const isNew = !before && !created.current.has(id);
    if (isNew) {
      created.current.add(id);
      bump(fields.listId, 1);
    }
    setAll((prev) => {
      const existing = prev.find((n) => n.id === id);
      if (existing) return prev.map((n) => (n.id === id ? { ...n, ...fields, updatedAt: stamp } : n));
      return [...prev, { id, userId, taskId: null, ...fields, createdAt: stamp, updatedAt: stamp, deletedAt: null }];
    });
    return queue(id, () => saveNote({ id, userId, ...fields })).then(
      (saved) => {
        // The text on screen may be newer than this write; take only the server's timestamps.
        setAll((prev) => prev.map((n) => (n.id === id ? { ...n, createdAt: saved.createdAt, updatedAt: saved.updatedAt } : n)));
        setError(null);
        if (isNew || (before && before.listId !== fields.listId)) recount();
      },
      (e) => {
        setError(copy.saveFailed);
        throw e;
      },
    );
  };

  const remove: Store['remove'] = (note, { quiet = false } = {}) => {
    const stamp = new Date().toISOString();
    const mark = (deletedAt: string | null) => {
      setAll((prev) => prev.map((n) => (n.id === note.id ? { ...n, deletedAt } : n)));
      bump(note.listId, deletedAt ? -1 : 1);
    };
    mark(stamp);
    // Its checklist lines go with it (only the ones still here, so Undo brings back just those).
    const lines = checklistIds(note.body).filter((id) => tasks.some((t) => t.id === id && !t.deletedAt));
    const deleting = queue(note.id, async () => {
      await setNoteDeleted(note.id, stamp);
      await setDeletedMany(lines, stamp);
    });
    deleting.then(recount, () => {
      mark(null);
      clearNotice();
      setError(copy.saveFailed);
    });
    if (quiet) return;
    const title = summarizeNote(note, new Map(tasks.map((t) => [t.id, t]))).title || copy.untitled;
    notify(copy.deleted(title), () => {
      mark(null);
      queue(note.id, async () => {
        await setNoteDeleted(note.id, null);
        await setDeletedMany(lines, null);
      }).then(recount, () => {
        mark(stamp);
        setError(copy.saveFailed);
      });
    });
  };

  const refresh = () => {
    setStatus('loading');
    setReloads((n) => n + 1);
  };

  return (
    <Ctx.Provider value={{ notes, status, error, refresh, count, open, pages, ensure, save, remove }}>{children}</Ctx.Provider>
  );
}

export function useNotes(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useNotes must be used inside <NotesProvider>');
  return store;
}

/** A scope's notes, loading its first page when first shown (`null`: none, e.g. Customs). */
export function useNotePages(scope: NoteScope | null): NotePages {
  const store = useNotes();
  const openScope = useEffectEvent((s: NoteScope) => store.open(s));
  useEffect(() => {
    if (scope) openScope(scope);
  }, [scope]);
  return scope ? store.pages(scope) : { notes: [], more: false, status: 'ready', showOlder: () => undefined };
}
