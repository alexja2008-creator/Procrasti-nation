import { voice } from '@pn/core';

import { useTasks } from '@/data/tasks-store';

/**
 * Checking off a row on a list that hides finished items (Upcoming, a
 * territory): the row leaves, so offer a way back. Repeats say where they
 * moved instead.
 */
export function useCheckOff() {
  const { tasks, toggle, notify } = useTasks();
  return (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    toggle(task);
    if (!task.rrule && !task.completedAt) {
      notify(voice.upcoming.stamped(task.title), () => toggle({ ...task, status: 'completed', completedAt: new Date().toISOString() }));
    }
  };
}
