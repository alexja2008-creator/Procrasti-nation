import { buildNotes, voice, type Note, type Task } from '@pn/core';

/** Note titles by note id: a checklist task's context on Today and Upcoming. */
export const noteTitles = (notes: Note[], tasks: Task[]): [string, string][] =>
  buildNotes(notes, tasks).map((s) => [s.note.id, s.title || voice.notes.untitled]);
