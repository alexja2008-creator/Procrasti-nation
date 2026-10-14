import { voice, type List } from '@pn/core';
import * as Crypto from 'expo-crypto';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { fetchLists, insertList, setListDeleted, updateList, type ListPatch } from '@/data/lists';
import { useTasks } from '@/data/tasks-store';

const copy = voice.territories;

type Store = {
  /** Live territories, in the person's order. */
  lists: List[];
  status: 'loading' | 'ready' | 'error';
  /** Last failed save, shown on the Territories screens. */
  error: string | null;
  refresh: () => void;
  add: (fields: Pick<List, 'name' | 'kind' | 'ink'>) => Promise<List | null>;
  /** Edits a territory; applies now, rolls back if the save fails. */
  update: (list: List, patch: ListPatch) => void;
  /** Deletes a territory; its tasks go back to Customs (or stay on their days). Offers Undo. */
  remove: (list: List) => void;
};

const Ctx = createContext<Store | null>(null);

const byOrder = (a: List, b: List) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);

/** The signed-in person's territories. Lives inside `TasksProvider`: deleting one unfiles tasks. */
export function ListsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { unfile, refile, notify, clearNotice } = useTasks();
  const [all, setAll] = useState<List[]>([]);
  const [status, setStatus] = useState<Store['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && setReloads((n) => n + 1));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchLists(userId).then(
      (rows) => {
        if (cancelled) return;
        setAll(rows);
        setStatus('ready');
      },
      () => !cancelled && setStatus((s) => (s === 'ready' ? s : 'error')),
    );
    return () => {
      cancelled = true;
    };
  }, [userId, reloads]);

  const lists = useMemo(() => all.filter((l) => !l.deletedAt).sort(byOrder), [all]);
  const replace = (id: string, next: List) => setAll((prev) => prev.map((l) => (l.id === id ? next : l)));

  const add: Store['add'] = async (fields) => {
    const stamp = new Date().toISOString();
    const draft: List = {
      id: Crypto.randomUUID(),
      userId,
      ...fields,
      sortOrder: Math.max(0, ...all.map((l) => l.sortOrder)) + 1,
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
    };
    setAll((prev) => [...prev, draft]);
    try {
      const saved = await insertList(draft);
      replace(draft.id, saved);
      setError(null);
      return saved;
    } catch {
      setAll((prev) => prev.filter((l) => l.id !== draft.id));
      setError(copy.saveFailed);
      return null;
    }
  };

  const update: Store['update'] = (list, patch) => {
    replace(list.id, { ...list, ...patch });
    updateList(list.id, patch).then(
      (saved) => {
        replace(list.id, saved);
        setError(null);
      },
      () => {
        replace(list.id, list);
        setError(copy.saveFailed);
      },
    );
  };

  const remove: Store['remove'] = (list) => {
    const stamp = new Date().toISOString();
    const mark = (deletedAt: string | null) => setAll((prev) => prev.map((l) => (l.id === list.id ? { ...l, deletedAt } : l)));
    mark(stamp);
    // Tasks leave first: if the delete then fails, they're filed again and nothing is lost.
    const deleting = (async () => {
      const ids = await unfile(list.id);
      try {
        await setListDeleted(list.id, stamp);
      } catch (e) {
        await refile(ids, list.id).catch(() => undefined);
        throw e;
      }
      return ids;
    })();
    deleting.catch(() => {
      mark(null);
      clearNotice();
      setError(copy.saveFailed);
    });
    // Undo waits for the delete to land, so the writes can't arrive out of order.
    const undo = () => {
      mark(null);
      deleting.then(
        async (ids) => {
          try {
            await setListDeleted(list.id, null);
            await refile(ids, list.id);
          } catch {
            setError(copy.saveFailed);
            setReloads((n) => n + 1);
          }
        },
        () => undefined,
      );
    };
    notify(copy.deleted(list.name), undo);
  };

  const refresh = () => {
    setStatus('loading');
    setReloads((n) => n + 1);
  };

  return <Ctx.Provider value={{ lists, status, error, refresh, add, update, remove }}>{children}</Ctx.Provider>;
}

export function useLists(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useLists must be used inside <ListsProvider>');
  return store;
}
