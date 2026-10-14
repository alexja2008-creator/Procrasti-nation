// The web schedules nothing itself: apps/site's sender works out what's due
// each minute from the tasks on the server, so a change made anywhere counts.
// All a browser keeps is its subscription, saved for whoever is signed in.
import type { ReminderOptions, Task } from '@pn/core';

import { subscribeHere, unsubscribeHere } from '@/notifications/web-push';

/** Runs only while reminders are on here (the provider checks); the subscription can lapse or change. */
export const syncReminders = async (_tasks: Task[], _options: ReminderOptions): Promise<void> =>
  subscribeHere().catch(() => undefined);

/** Signing out: this browser stops ringing their reminders. */
export const clearReminders = (): Promise<void> => unsubscribeHere().catch(() => undefined);
