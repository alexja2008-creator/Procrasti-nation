// Download your data: everything a person keeps in ProcrastiNation, as one JSON file, in words
// that make sense outside the app. Built on the device from the rows they can already read.

import { parseNoteBody } from './notes.ts';
import type { List, Note, Preferences, Task, UserSettings } from './types.ts';

export const EXPORT_FORMAT = 'procrastination-export';
export const EXPORT_VERSION = 1;

export type ExportInput = {
  exportedAt: string;
  account: { citizenNumber: number | null; email: string | null; phone: string | null; createdAt: string | null; username: string | null };
  settings: UserSettings | null;
  lists: List[];
  tasks: Task[];
  notes: Note[];
  stamps: { kind: string; earnedAt: string; taskId: string | null; listId: string | null }[];
  starts: { taskId: string | null; startedAt: string; endedAt: string | null; plannedMinutes: number; outcome: string | null }[];
  plans: { taskId: string | null; createdAt: string }[];
};

/**
 * A note as plain text: its lines as written, with each checklist line (a task, in the app) as
 * "[x] Read chapter 5" or "[ ] …". A line whose task is gone reads "[ ] (removed)".
 */
export function noteAsText(body: string, tasks: Map<string, Pick<Task, 'title' | 'completedAt'>>): string {
  return parseNoteBody(body)
    .map((block) => {
      if (block.kind === 'text') return block.text;
      const task = tasks.get(block.taskId);
      return task ? `[${task.completedAt ? 'x' : ' '}] ${task.title}` : '[ ] (removed)';
    })
    .join('\n');
}

const answers = (p: Partial<Preferences>) => ({
  purposeOfVisit: p.persona ?? null,
  hours: p.hours ?? null,
  whatStopsYou: p.style ?? null,
  nudgeTone: p.nudgeTone ?? null,
  heardFrom: p.heardFrom ?? null,
});

/** The export file's contents. Deleted things (tasks, notes, territories) are left out. */
export function buildExport(input: ExportInput) {
  const live = <T extends { deletedAt: string | null }>(rows: T[]) => rows.filter((r) => !r.deletedAt);
  const tasks = live(input.tasks);
  const byId = new Map(input.tasks.map((t) => [t.id, t]));
  const prefs = input.settings?.preferences ?? {};

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: input.exportedAt,
    account: input.account,
    settings: input.settings
      ? {
          timezone: input.settings.timezone,
          dayEndsAtHour: input.settings.dayRolloverHour,
          application: answers(prefs),
          applicationCompletedAt: input.settings.onboardingCompletedAt,
          startModeMinutes: prefs.startMinutes ?? null,
          morningList: prefs.reminders?.morningList ?? null,
        }
      : null,
    territories: live(input.lists)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => ({ id: l.id, name: l.name, kind: l.kind, ink: l.ink, createdAt: l.createdAt })),
    tasks: tasks
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.sortOrder - b.sortOrder))
      .map((t) => ({
        id: t.id,
        title: t.title,
        notes: t.notes,
        territoryId: t.listId,
        /** A plan step's plan (another task here). */
        planId: t.parentId,
        /** A note's checklist line: the note it's in. */
        noteId: t.noteId,
        scheduledOn: t.scheduledOn,
        remindAt: t.remindAt,
        dueOn: t.dueOn,
        dueAt: t.dueAt,
        repeat: t.rrule,
        estimateMinutes: t.estimateMinutes,
        source: t.source,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
      })),
    notes: live(input.notes)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .map((n) => ({ id: n.id, territoryId: n.listId, text: noteAsText(n.body, byId), createdAt: n.createdAt, updatedAt: n.updatedAt })),
    stamps: input.stamps,
    startModeSessions: input.starts,
    aiPlans: input.plans,
  };
}

/** "procrastination-2026-10-07.json". */
export const exportFileName = (localDate: string) => `procrastination-${localDate}.json`;
