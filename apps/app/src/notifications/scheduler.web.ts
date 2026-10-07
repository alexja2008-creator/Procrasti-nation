// The web schedules nothing until Web Push (the next feature).
import type { ReminderOptions, Task } from '@pn/core';

export const syncReminders = async (_tasks: Task[], _options: ReminderOptions): Promise<void> => undefined;

export const clearReminders = async (): Promise<void> => undefined;
