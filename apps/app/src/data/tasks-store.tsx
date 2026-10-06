import {
  atLocalTime,
  logicalDateString,
  nextOccurrence,
  parseLocalDate,
  relativeDayPhrase,
  voice,
  type LocalDate,
  type QuickAddResult,
  type Task,
} from '@pn/core';
import * as Crypto from 'expo-crypto';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { fetchActiveTasks, insertTask, setDeleted, updateTask, type TaskPatch } from '@/data/tasks';
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
  add: (parsed: QuickAddResult) => Promise<Task | null>;
  toggle: (task: Task) => void;
  /** Adds or replaces tasks already saved elsewhere (e.g. a new plan's steps). */
  merge: (saved: Task[]) => void;
  /** Shows a short-lived note on Today (e.g. after leaving Start Mode). */
  notify: (message: string) => void;
  /** Edits a task; applies now, rolls back if the save fails. */
  update: (task: Task, patch: TaskPatch) => void;
  /** Deletes a task with its steps, offering Undo on Today. */
  remove: (task: Task) => void;
};

const Ctx = createContext<Store | null>(null);

/**
 * Tasks for the signed-in person: open ones plus anything finished today.
 * Changes apply immediately and roll back if the save fails.
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
    fetchActiveTasks(userId, dayStart).then(
      (rows) => {
        if (cancelled) return;
        setTasks(rows);
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

  const add: Store['add'] = async (parsed) => {
    const { time, scheduledOn, dueOn } = parsed;
    const stamp = new Date().toISOString();
    const draft: Task = {
      id: Crypto.randomUUID(),
      userId,
      listId: null,
      parentId: null,
      title: parsed.title,
      notes: null,
      status: 'in_progress',
      scheduledOn,
      dueOn,
      remindAt: time && scheduledOn ? atLocalTime(scheduledOn, time.hour, time.minute) : null,
      dueAt: time && !scheduledOn && dueOn ? atLocalTime(dueOn, time.hour, time.minute) : null,
      rrule: parsed.rrule,
      estimateMinutes: null,
      sortOrder: Date.now(),
      source: 'self',
      externalId: null,
      completedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
    };
    setTasks((prev) => [...prev, draft]);
    try {
      const saved = await insertTask(draft);
      replace(draft.id, saved);
      setError(null);
      return saved;
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== draft.id));
      setError(voice.today.saveFailed);
      return null;
    }
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
    updateTask(task.id, patch).then(
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
    replace(task.id, { ...task, ...patch });
    updateTask(task.id, patch).then(
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

  const refresh = () => {
    setStatus('loading');
    setReloads((n) => n + 1);
  };

  return (
    <Ctx.Provider value={{ tasks, status, today, rolloverHour, error, notice, refresh, add, toggle, merge, notify: (text) => setNotice({ text }), update, remove }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTasks(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useTasks must be used inside <TasksProvider>');
  return store;
}
