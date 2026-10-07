// What a reminder's buttons and a tap do. Done and Snooze act without opening
// the app; Start 5 min opens Start Mode on the task; a tap opens the task (the
// morning list opens Today). Responses arrive through a listener while the app
// runs, or as the one that launched it; each is handled once, even across a
// reload.
//
// With the app closed, iOS hands Done and Snooze to the Swift add-on only
// (modules/reminder-actions): it schedules a Snooze itself and keeps each Done
// until the app opens and saves it here. Expo Go doesn't have the add-on, so
// there the app handles both itself, while it's running.
import { checkOff, logicalDateString, snoozeOf, type Task } from '@pn/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

import { fetchTask, updateTask } from '@/data/tasks';
import { supabase } from '@/lib/supabase';
import { ReminderAction, registerButtons } from '@/notifications/buttons';
import { scheduleReminder, type ReminderData } from '@/notifications/scheduler';

/** Where a reminder asks to go, once the signed-in screens are up. */
export type Destination = { to: 'task' | 'start'; taskId: string } | { to: 'today' };

/** A Done waiting to be saved: pressed with the app closed, offline, or before sign-in. An empty `day` is none. */
type DoneEntry = { key: string; taskId: string; day: string; rollover: number; at: number };

const native = requireOptionalNativeModule<{ pendingDone(): DoneEntry[]; removeDone(keys: string[]): void }>('ReminderActions');

const OUTBOX_KEY = 'pn.reminders.done-outbox';
const HANDLED_KEY = 'pn.reminders.handled';

// Device storage, one change at a time (each reads what the last one wrote).
let storage: Promise<unknown> = Promise.resolve();
function serially<T>(change: () => Promise<T>): Promise<T> {
  const next = storage.then(change);
  storage = next.catch(() => undefined);
  return next;
}

async function readList<T>(key: string): Promise<T[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(key)) ?? '[]') as T[];
  } catch {
    return [];
  }
}

/** Dones waiting: the Swift add-on's (app closed) and the app's own (Expo Go, or a save that failed). */
const outbox = {
  list: async (): Promise<DoneEntry[]> => [...(native?.pendingDone() ?? []), ...(await readList<DoneEntry>(OUTBOX_KEY))],
  add: (entry: DoneEntry) =>
    serially(async () => {
      const entries = await readList<DoneEntry>(OUTBOX_KEY);
      if (!entries.some((e) => e.key === entry.key)) await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify([...entries, entry]));
    }),
  remove: (key: string) => {
    native?.removeDone([key]);
    return serially(async () =>
      AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify((await readList<DoneEntry>(OUTBOX_KEY)).filter((e) => e.key !== key))),
    );
  },
};

const saved = new Set<(task: Task) => void>();

/** A Done from a reminder was saved: the tasks store takes the new row. */
export function onDoneSaved(listener: (task: Task) => void): () => void {
  saved.add(listener);
  return () => saved.delete(listener);
}

/** Saves one Done exactly as checking the task off would have, as of when it was pressed. */
async function applyDone(entry: DoneEntry): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Not signed in'); // keep it for when they are
  const task = await fetchTask(entry.taskId);
  // Gone (or someone else's), finished already, or a repeat already past this occurrence: nothing to do.
  if (!task || task.completedAt || (task.rrule && entry.day && task.scheduledOn && task.scheduledOn > entry.day)) return;
  const pressed = new Date(entry.at);
  const row = await updateTask(task.id, checkOff(task, logicalDateString(pressed, entry.rollover), pressed).patch);
  saved.forEach((listener) => listener(row));
}

let saving: Promise<void> | null = null;
let saveAgain = false;

/** Saves every Done waiting, oldest first; stops at the first that can't be saved yet (offline, signed out). */
export function saveDones(): Promise<void> {
  saveAgain = true;
  saving ??= (async () => {
    while (saveAgain) {
      saveAgain = false;
      for (const entry of await outbox.list()) {
        try {
          await applyDone(entry);
        } catch {
          return; // the next foreground or sign-in tries again
        }
        await outbox.remove(entry.key);
      }
    }
  })().finally(() => {
    saving = null;
  });
  return saving;
}

// Where to go, kept until the signed-in screens listen (a tap can launch the app).
let destination: Destination | null = null;
const openers = new Set<(d: Destination) => void>();

function go(d: Destination) {
  if (openers.size === 0) destination = d;
  else openers.forEach((open) => open(d));
}

export function onDestination(open: (d: Destination) => void): () => void {
  openers.add(open);
  if (destination) {
    const waiting = destination;
    destination = null;
    open(waiting);
  }
  return () => openers.delete(open);
}

const seen = new Set<string>();

/** True the first time this device sees a response; remembered across reloads (iOS keeps the last one). */
async function firstTime(key: string): Promise<boolean> {
  if (seen.has(key)) return false;
  seen.add(key);
  return serially(async () => {
    const handled = await readList<string>(HANDLED_KEY);
    if (handled.includes(key)) return false;
    await AsyncStorage.setItem(HANDLED_KEY, JSON.stringify([...handled, key].slice(-50)));
    return true;
  });
}

async function handle(response: Notifications.NotificationResponse) {
  const { request, date } = response.notification;
  const key = `${request.identifier}|${response.actionIdentifier}|${date}`;
  if (!(await firstTime(key))) return;
  Notifications.clearLastNotificationResponseAsync().catch(() => undefined);

  const data = (request.content.data ?? {}) as Partial<ReminderData>;
  const { taskId } = data;
  switch (response.actionIdentifier) {
    case ReminderAction.done:
      if (!taskId) return;
      // With the add-on, the Done is already waiting on the device.
      if (!native) await outbox.add({ key, taskId, day: data.day ?? '', rollover: data.rollover ?? 0, at: Date.now() });
      await saveDones();
      return;
    case ReminderAction.snooze:
      if (native || !taskId) return; // the add-on has scheduled it
      await scheduleReminder(
        snoozeOf({ taskId, day: data.day ?? null, title: request.content.title ?? '', body: request.content.body ?? '' }, new Date()),
        { repeats: !!data.repeats, rollover: data.rollover ?? 0 },
      ).catch(() => undefined);
      return;
    case ReminderAction.start:
      if (taskId) go({ to: 'start', taskId });
      return;
    case Notifications.DEFAULT_ACTION_IDENTIFIER:
      go(taskId ? { to: 'task', taskId } : { to: 'today' });
  }
}

// From the moment the app starts, signed in or not.
registerButtons();
Notifications.addNotificationResponseReceivedListener((response) => void handle(response));
Notifications.getLastNotificationResponseAsync().then((response) => response && handle(response), () => undefined);
AppState.addEventListener('change', (state) => state === 'active' && void saveDones());
