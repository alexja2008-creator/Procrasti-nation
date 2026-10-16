import { followPatches, undoPatch, voice, type LocalDate, type Task } from '@pn/core';

import { useTasks } from '@/data/tasks-store';

/**
 * A plan's step just moved to a later day (When, Move to…, a Declaration):
 * asks "Move the rest of the plan too?", and on Move them moves the steps after
 * it with one Undo. Asked each time, never automatic (Alex, 2026-10-15). `lead`
 * is what was just done ("Declared: …"), said before the question in the same
 * notice but without its Undo: beside a yes/no question, Undo reads as "no" (a
 * Declaration can still be changed on the task page). Returns whether it asked,
 * so the caller can say `lead` with its Undo when not.
 */
export function useFollowSteps() {
  const { tasks, today, update, notify, offer } = useTasks();
  return (before: Task, to: LocalDate | null, lead?: string): boolean => {
    if (!to || !before.parentId) return false;
    const plan = tasks.find((t) => t.id === before.parentId);
    const steps = tasks.filter((t) => t.parentId === before.parentId);
    const changes = followPatches(steps, before, to, plan?.dueOn ?? null, today);
    if (!changes.length) return false;
    const move = () => {
      for (const { task, patch } of changes) update(task, patch);
      notify(voice.task.followed(changes.length), () => {
        for (const { task, patch } of changes) update({ ...task, ...patch }, undoPatch(task, patch));
      });
    };
    offer(lead ? `${lead} ${voice.task.followAsk}` : voice.task.followAsk, { label: voice.task.followMove, run: move });
    return true;
  };
}
