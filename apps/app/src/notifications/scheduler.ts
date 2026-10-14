// Keeps the phone's pending reminders in step with the plan (`reminderChanges`
// in @pn/core), whenever tasks or settings change and when the app comes back
// to the foreground. One pass at a time; asking again mid-pass gets one more
// pass with the newest inputs.
import { reminderChanges, type Reminder, type ReminderOptions, type Task } from '@pn/core';
import * as Notifications from 'expo-notifications';

import { TASK_CATEGORY } from '@/notifications/buttons';

// A reminder rings even while the app is open, like Reminders does.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** What a reminder carries for its buttons, read by the app and, with the app closed, by the Swift add-on. */
export type ReminderData = {
  kind: Reminder['kind'];
  /** Not on the morning list. (No nulls: iOS can't store them in a notification.) */
  taskId?: string;
  /** The day it's for (a repeat's occurrence). */
  day?: string;
  /** Done moves a repeat on instead of finishing it. */
  repeats: boolean;
  /** The person's rollover hour, so Done knows which day it is. */
  rollover: number;
};

type Inputs = { tasks: Task[]; options: ReminderOptions };

let queued: Inputs | null = null;
let running: Promise<void> | null = null;

export function syncReminders(tasks: Task[], options: ReminderOptions): Promise<void> {
  queued = { tasks, options };
  running ??= drain().finally(() => {
    running = null;
  });
  return running;
}

async function drain() {
  while (queued) {
    const { tasks, options } = queued;
    queued = null;
    await pass(tasks, options).catch(() => undefined); // the next change or foreground tries again
  }
}

async function pass(tasks: Task[], options: ReminderOptions) {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const { cancel, add } = reminderChanges(
    pending.map((p) => ({ id: p.identifier, title: p.content.title ?? '', body: p.content.body ?? '' })),
    tasks,
    new Date(),
    options,
  );
  const repeats = new Set(tasks.filter((t) => t.rrule).map((t) => t.id));
  await Promise.all(cancel.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  for (const r of add) {
    await scheduleReminder(r, { repeats: !!r.taskId && repeats.has(r.taskId), rollover: options.rolloverHour ?? 0 });
  }
}

/** Schedules one reminder (a new id, or the same id again to replace it). */
export function scheduleReminder(r: Reminder, extra: Pick<ReminderData, 'repeats' | 'rollover'>): Promise<string> {
  const data: ReminderData = { kind: r.kind, ...(r.taskId && { taskId: r.taskId }), ...(r.day && { day: r.day }), ...extra };
  return Notifications.scheduleNotificationAsync({
    identifier: r.id,
    content: {
      title: r.title,
      body: r.body,
      data,
      categoryIdentifier: r.kind === 'morning' ? undefined : TASK_CATEGORY,
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
  });
}

/** Signing out: nothing of theirs rings for whoever signs in next. */
export async function clearReminders(): Promise<void> {
  queued = null;
  await running;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}

