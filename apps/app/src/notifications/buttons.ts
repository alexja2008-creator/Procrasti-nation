// The buttons under a task's reminder (press and hold it, or pull it down):
// Done · Snooze 10 min · Start 5 min. Done and Snooze act without opening the
// app; Start opens it into Start Mode. The morning list has no buttons.
import { actions, voice } from '@pn/core';
import * as Notifications from 'expo-notifications';

export const TASK_CATEGORY = 'task';

export const ReminderAction = { done: 'done', snooze: 'snooze', start: 'start' } as const;

let registered: Promise<unknown> | null = null;

export function registerButtons(): void {
  registered ??= Notifications.setNotificationCategoryAsync(TASK_CATEGORY, [
    { identifier: ReminderAction.done, buttonTitle: actions.done, options: { opensAppToForeground: false } },
    { identifier: ReminderAction.snooze, buttonTitle: voice.reminders.snooze, options: { opensAppToForeground: false } },
    { identifier: ReminderAction.start, buttonTitle: actions.startFive, options: { opensAppToForeground: true } },
  ]).catch(() => {
    registered = null; // try again next launch
  });
}
