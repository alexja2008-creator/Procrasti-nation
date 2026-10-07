// The web has no reminders until Web Push (the next feature), so nothing responds.
import type { Task } from '@pn/core';

export type Destination = { to: 'task' | 'start'; taskId: string } | { to: 'today' };

export const onDoneSaved = (_listener: (task: Task) => void) => () => undefined;

export const saveDones = async (): Promise<void> => undefined;

export const onDestination = (_open: (d: Destination) => void) => () => undefined;
