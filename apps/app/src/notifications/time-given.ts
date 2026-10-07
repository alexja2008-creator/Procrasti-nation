// "A task just got a time on this device": quick add, When or Due, a note's
// checklist line. The first time it happens while notifications are
// undecided is when the app asks for them ("Want a nudge at 6:00 PM?"), never
// on launch. The tasks store sits above the reminders, so it tells them
// through this rather than through context.
import { planReminders, type Task } from '@pn/core';

type Listener = (ringsAt: Date) => void;

const listeners = new Set<Listener>();

/** Called by the tasks store with a task it just added or re-timed; tells listeners when it will first ring. */
export function timeGiven(task: Task): void {
  if (listeners.size === 0 || (!task.remindAt && !task.dueAt)) return;
  const [first] = planReminders([task], new Date(), { limit: 1 });
  if (first) listeners.forEach((listener) => listener(new Date(first.at)));
}

export function onTimeGiven(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
