import {
  atLocalTime,
  logicalDateString,
  scheduleOf,
  nextOccurrence,
  parseLocalDate,
  relativeDayPhrase,
  voice,
  type LocalDate,
  type QuickAddResult,
  type Task,
} from '@pn/core';
import * as Crypto from 'expo-crypto';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { fetchActiveTasks, fetchNoteTasks, fileNoteTasks, insertTask, refileTasks, setDeleted, unfileTasks, updateTask, type TaskPatch } from '@/data/tasks';
import { useUserSettings } from '@/data/user-settings';

/** A short-lived note on Today, optionally with Undo. */
export type Notice = { text: string; undo?: () => void };

type Store = {
  tasks: Task[];
  status: 'loading' | 'ready' | 'error';
  /** The person's current day, honoring their rollover hour. */
  today: LocalDate;
  rolloverHour: number;
  /** Last failed save, shown gently on Today. */
  error: string | null;
  /** Short-lived confirmation, e.g. where a repeating task moved to. */
  notice: Notice | null;
  refresh: () => void;
  /** Captures a task; `listId` files it in a territory. */
  add: (parsed: QuickAddResult, listId?: string | null) => Promise<Task | null>;
  /** Adds a step (a subtask the person typed) at the end of a task's steps. */
  addStep: (parent: Task, title: string) => Promise<Task | null>;
  toggle: (task: Task) => void;
  /** Adds or replaces tasks already saved elsewhere (e.g. a new plan's steps). */
  merge: (saved: Task[]) => void;
  /** Shows a short-lived note (e.g. after leaving Start Mode), with Undo when given one. */
  notify: (message: string, undo?: () => void) => void;
  clearNotice: () => void;
  /** Edits a task; applies now, rolls back if the save fails. */
  update: (task: Task, patch: TaskPatch) => void;
  /** Deletes a task with its steps, offering Undo on Today. */
  remove: (task: Task) => void;
  /** Takes every task out of a territory (it's being deleted); resolves to their ids, or throws. */
  unfile: (listId: string) => Promise<string[]>;
  /** Puts those tasks back (Undo); throws if the save fails. */
  refile: (ids: string[], listId: string) => Promise<void>;
  /**
   * Adds a checklist line's task to a note. Shows at once; the save waits for
   * `noteSaved` (the note must exist first). Resolves false if it failed.
   */
  addToNote: (fields: Pick<Task, 'id' | 'noteId' | 'listId' | 'title'> & Partial<TaskPatch>, noteSaved: Promise<unknown>) => Promise<boolean>;
  /** Deletes (or, with null, restores) several tasks at once, quietly; throws if the save fails. */
  setDeletedMany: (ids: string[], deletedAt: string | null) => Promise<void>;
  /** A note moved territory: its checklist lines follow. */
  fileNote: (noteId: string, listId: string | null) => void;
  /**
   * Loads these notes' checklist lines, ticked ones included (the active
   * tasks leave ticked lines out), and keeps them loaded through refreshes.
   */
  loadNoteLines: (noteIds: string[]) => void;
  /** Adds tasks found elsewhere (search) that aren't loaded, so they can be checked off; leaves loaded ones alone. */
  include: (found: Task[]) => void;
};

const Ctx = createContext<Store | null>(null);

/**
 * Tasks for the signed-in person: open ones plus anything finished today,
 * and every checklist line (ticked ones too) of the notes loaded. Changes
 * apply immediately and roll back if the save fails.
 */
export function TasksProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { settings } = useUserSettings();
  const rolloverHour = settings?.dayRolloverHour ?? 0;

  const [now, setNow] = useState(() => Date.now());
  const today = logicalDateString(new Date(now), rolloverHour);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<Store['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reloads, setReloads] = useState(0);
  // Inserts still on their way, by task id: later writes to that task wait for them.
  const inserting = useRef(new Map<string, Promise<unknown>>());
  // Notes whose checklist lines are loaded, ticked ones included: the notes on screen.
  const noteScope = useRef(new Set<string>());
  const afterInsert = (id: string) => inserting.current.get(id)?.catch(() => undefined) ?? Promise.resolve();

  // Notice the day changing, and refresh when the app comes back to the foreground.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setNow(Date.now());
      setReloads((n) => n + 1);
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const dayStart = parseLocalDate(today);
    dayStart.setHours(rolloverHour, 0, 0, 0);
    const scoped = [...noteScope.current];
    Promise.all([fetchActiveTasks(userId, dayStart), scoped.length ? fetchNoteTasks(scoped) : Promise.resolve([])]).then(
      ([rows, lines]) => {
        if (cancelled) return;
        const ids = new Set(rows.map((t) => t.id));
        const fetched = [...rows, ...lines.filter((t) => !ids.has(t.id))];
        const fetchedIds = new Set(fetched.map((t) => t.id));
        const refreshed = new Set(scoped);
        // Lines of notes that loaded while this was on its way stay.
        setTasks((prev) => [
          ...fetched,
          ...prev.filter((t) => t.noteId && !refreshed.has(t.noteId) && noteScope.current.has(t.noteId) && !fetchedIds.has(t.id)),
        ]);
        setStatus('ready');
      },
      () => !cancelled && setStatus((s) => (s === 'ready' ? s : 'error')),
    );
    return () => {
      cancelled = true;
    };
  }, [userId, today, rolloverHour, reloads]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), notice.undo ? 10_000 : 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const replace = (id: string, next: Task) => setTasks((prev) => prev.map((t) => (t.id === id ? next : t)));
  /** Some fields of a task, onto the task as it stands (a caller's copy can be a render old, e.g. just deleted). */
  const patchRow = (id: string, patch: Partial<Task>) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  /** Shows a new task at once and saves it; takes it back out if the save fails. */
  const insert = async (fields: Partial<Task> & Pick<Task, 'title' | 'sortOrder'>, after?: Promise<unknown>) => {
    const stamp = new Date().toISOString();
    const draft: Task = {
      id: Crypto.randomUUID(),
      userId,
      listId: null,
      parentId: null,
      noteId: null,
      notes: null,
      status: 'in_progress',
      scheduledOn: null,
      dueOn: null,
      remindAt: null,
      dueAt: null,
      rrule: null,
      estimateMinutes: null,
      source: 'self',
      externalId: null,
      completedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
      ...fields,
    };
    setTasks((prev) => [...prev, draft]);
    const write = (async () => {
      await after;
      return insertTask(draft);
    })();
    inserting.current.set(draft.id, write);
    try {
      const saved = await write;
      replace(draft.id, saved);
      setError(null);
      return saved;
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== draft.id));
      setError(voice.today.saveFailed);
      return null;
    } finally {
      inserting.current.delete(draft.id);
    }
  };

  const add: Store['add'] = (parsed, listId = null) =>
    insert({ title: parsed.title, listId, ...scheduleOf(parsed), sortOrder: Date.now() });

  const addToNote: Store['addToNote'] = async (fields, noteSaved) =>
    (await insert({ ...fields, sortOrder: Date.now() }, noteSaved)) !== null;

  const setDeletedMany: Store['setDeletedMany'] = async (ids, deletedAt) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    const mark = (at: string | null) => setTasks((prev) => prev.map((t) => (set.has(t.id) ? { ...t, deletedAt: at } : t)));
    mark(deletedAt);
    try {
      await Promise.all(ids.map(afterInsert));
      await setDeleted(ids, deletedAt);
    } catch (e) {
      mark(deletedAt ? null : new Date().toISOString());
      throw e;
    }
  };

  const fileNote: Store['fileNote'] = (noteId, listId) => {
    setTasks((prev) => prev.map((t) => (t.noteId === noteId ? { ...t, listId } : t)));
    fileNoteTasks(noteId, listId).catch(() => setError(voice.today.saveFailed));
  };

  const addStep: Store['addStep'] = (parent, title) => {
    const siblings = tasks.filter((t) => t.parentId === parent.id && !t.deletedAt);
    return insert({ parentId: parent.id, title, sortOrder: Math.max(0, ...siblings.map((t) => t.sortOrder)) + 1 });
  };

  const toggle: Store['toggle'] = (task) => {
    let patch: TaskPatch;
    if (task.completedAt) {
      patch = { status: 'in_progress', completedAt: null };
    } else if (task.rrule) {
      // Repeating tasks move to their next date instead of finishing. (Anchoring
      // on the current date can drift a monthly-on-the-31st series; fine for now.)
      const anchor = task.scheduledOn ?? today;
      const next = nextOccurrence(task.rrule, anchor, anchor > today ? anchor : today);
      const remind = task.remindAt ? new Date(task.remindAt) : null;
      patch = { scheduledOn: next, remindAt: remind ? atLocalTime(next, remind.getHours(), remind.getMinutes()) : null };
      setNotice({ text: voice.today.movedOn(task.title, relativeDayPhrase(next, today)) });
    } else {
      patch = { status: 'completed', completedAt: new Date().toISOString() };
    }
    replace(task.id, { ...task, ...patch });
    afterInsert(task.id).then(() => updateTask(task.id, patch)).then(
      (saved) => {
        replace(task.id, saved);
        setError(null);
      },
      () => {
        replace(task.id, task);
        setError(voice.today.saveFailed);
      },
    );
  };

  const merge: Store['merge'] = (saved) =>
    setTasks((prev) => {
      const byId = new Map(prev.map((t) => [t.id, t]));
      for (const t of saved) byId.set(t.id, t);
      return [...byId.values()];
    });

  const update: Store['update'] = (task, patch) => {
    patchRow(task.id, patch);
    afterInsert(task.id).then(() => updateTask(task.id, patch)).then(
      (saved) => {
        replace(task.id, saved);
        setError(null);
      },
      () => {
        // Those fields back as they were.
        patchRow(task.id, Object.fromEntries(Object.keys(patch).map((k) => [k, task[k as keyof Task]])));
        setError(voice.today.saveFailed);
      },
    );
  };

  const remove: Store['remove'] = (task) => {
    const ids = new Set([task.id, ...tasks.filter((t) => t.parentId === task.id).map((t) => t.id)]);
    const mark = (deletedAt: string | null) =>
      setTasks((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, deletedAt } : t)));
    const stamp = new Date().toISOString();
    mark(stamp);
    const deleting = setDeleted([...ids], stamp);
    deleting.catch(() => {
      mark(null);
      setNotice(null);
      setError(voice.today.saveFailed);
    });
    // Undo waits for the delete to land, so the two writes can't arrive out of order.
    const undo = () => {
      setNotice(null);
      mark(null);
      deleting.then(
        () => setDeleted([...ids], null).catch(() => {
          mark(stamp);
          setError(voice.today.saveFailed);
        }),
        () => undefined,
      );
    };
    setNotice({ text: voice.task.deleted(task.title), undo });
  };

  const notify: Store['notify'] = (text, undo) =>
    setNotice({
      text,
      undo: undo
        ? () => {
            setNotice(null);
            undo();
          }
        : undefined,
    });

  const setListOf = (ids: Set<string>, listId: string | null) =>
    setTasks((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, listId } : t)));

  const unfile: Store['unfile'] = async (listId) => {
    const ids = await unfileTasks(listId);
    setListOf(new Set(ids), null);
    return ids;
  };

  const refile: Store['refile'] = async (ids, listId) => {
    await refileTasks(ids, listId);
    setListOf(new Set(ids), listId);
  };

  const loadNoteLines: Store['loadNoteLines'] = (noteIds) => {
    const fresh = noteIds.filter((id) => !noteScope.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => noteScope.current.add(id));
    fetchNoteTasks(fresh).then(
      (lines) =>
        // Only lines not here already: one shown here may have a change on its way.
        setTasks((prev) => {
          const have = new Set(prev.map((t) => t.id));
          return [...prev, ...lines.filter((t) => !have.has(t.id))];
        }),
      () => fresh.forEach((id) => noteScope.current.delete(id)),
    );
  };

  const include: Store['include'] = (found) =>
    setTasks((prev) => {
      const have = new Set(prev.map((t) => t.id));
      const fresh = found.filter((t) => !have.has(t.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });

  const refresh = () => {
    setStatus('loading');
    setReloads((n) => n + 1);
  };

  return (
    <Ctx.Provider value={{ tasks, status, today, rolloverHour, error, notice, refresh, add, addStep, toggle, merge, notify, clearNotice: () => setNotice(null), update, remove, unfile, refile, addToNote, setDeletedMany, fileNote, loadNoteLines, include }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTasks(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useTasks must be used inside <TasksProvider>');
  return store;
}
