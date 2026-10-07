import { createContext, useContext, useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';

import { useCapture } from '@/components/capture';
import { ReminderPrompt } from '@/components/reminder-prompt';
import { useLists } from '@/data/lists-store';
import { loadNotNow, saveNotNow } from '@/data/reminder-ask';
import { useTasks } from '@/data/tasks-store';
import { getPermission, requestPermission, type Permission } from '@/notifications/permission';
import { clearReminders, syncReminders } from '@/notifications/scheduler';
import { onTimeGiven } from '@/notifications/time-given';

type Reminders = {
  /** Null until it's been read. 'unsupported' on web (Web Push is next). */
  permission: Permission | null;
  /** iOS's own prompt (or nothing, once iOS has its answer). */
  allow: () => Promise<void>;
};

const Ctx = createContext<Reminders>({ permission: null, allow: async () => undefined });

/** Waiting a moment after the last change saves a pass per keystroke-sized edit. */
const SYNC_PAUSE_MS = 1500;

/** Screens a sheet can open over: the tabs and a territory's page (not a modal, nor over the capture sheet). */
const isBaseRoute = (path: string) => path === '/' || /^\/(upcoming|territories|passport|territory)(\/|$)/.test(path);

/**
 * Reminders on this iPhone: keeps what's scheduled in step with the person's
 * tasks, and asks for notifications the first time a task gets a time (never
 * on launch). Clears everything on sign-out. On web it schedules nothing.
 */
export function RemindersProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { tasks, status, rolloverHour } = useTasks();
  const { lists, status: listsStatus } = useLists();
  const capture = useCapture();
  const pathname = usePathname();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [notNow, setNotNow] = useState<boolean | null>(null);
  const [asking, setAsking] = useState<Date | null>(null);
  const [askShown, setAskShown] = useState(false);

  // Read it now and on every return to the app: it can change in iOS Settings.
  useEffect(() => {
    const check = () => getPermission().then(setPermission, () => undefined);
    check();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => sub.remove();
  }, []);

  useEffect(() => {
    loadNotNow(userId).then(setNotNow);
  }, [userId]);

  // Line reminders up after a pause in changes. Coming back to the app refreshes the tasks, which lands here too.
  const ready = permission === 'granted' && status === 'ready' && listsStatus !== 'loading';
  const sync = useEffectEvent(() => syncReminders(tasks, { lists, rolloverHour }));
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(sync, SYNC_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [ready, tasks, lists, rolloverHour]);

  // Unmounting means they signed out.
  useEffect(() => () => void clearReminders(), []);

  // The first time a task gets a time while notifications are undecided.
  useEffect(() => {
    if (permission !== 'undetermined' || notNow !== false) return;
    return onTimeGiven((ringsAt) => setAsking((current) => current ?? ringsAt));
  }, [permission, notNow]);

  // Shown once nothing else is up (a sheet can't open over a modal screen or the capture sheet), after it has closed.
  const clear = !capture.isOpen && isBaseRoute(pathname);
  useEffect(() => {
    if (!asking || !clear) return;
    const timer = setTimeout(() => setAskShown(true), 500);
    return () => clearTimeout(timer);
  }, [asking, clear]);

  const settle = () => {
    setAsking(null);
    setAskShown(false);
  };

  const allow = async () => {
    settle();
    setPermission(await requestPermission().catch(() => permission));
  };

  const decline = () => {
    settle();
    setNotNow(true);
    saveNotNow(userId);
  };

  return (
    <Ctx.Provider value={{ permission, allow }}>
      {children}
      {asking && askShown ? <ReminderPrompt ringsAt={asking} onAllow={allow} onNotNow={decline} /> : null}
    </Ctx.Provider>
  );
}

export function useReminders(): Reminders {
  return useContext(Ctx);
}
