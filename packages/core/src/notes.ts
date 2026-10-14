// Capture-first notes. A note's body is plain text, one line per line. A live
// checklist line is stored as a token line, [[task:<id>]]: the task row owns
// its text and done state, so a line and its task can never disagree. The
// first line is the title. Pure and shared, so iOS and web edit alike.

import type { ISODateTime, Note, Task } from './types.ts';

export type NoteBlock = { kind: 'text'; text: string } | { kind: 'task'; taskId: string };

const TOKEN = /^\[\[task:([0-9a-fA-F-]{36})\]\]$/;

export const checklistToken = (taskId: string) => `[[task:${taskId}]]`;

/** Body → blocks: runs of text lines, and checklist lines. An empty body is one empty text block. */
export function parseNoteBody(body: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  let lines: string[] | null = null;
  for (const line of body.split('\n')) {
    const m = TOKEN.exec(line);
    if (!m) {
      (lines ??= []).push(line);
      continue;
    }
    if (lines) blocks.push({ kind: 'text', text: lines.join('\n') });
    lines = null;
    blocks.push({ kind: 'task', taskId: m[1] });
  }
  if (lines) blocks.push({ kind: 'text', text: lines.join('\n') });
  return blocks;
}

export function serializeNoteBody(blocks: NoteBlock[]): string {
  return blocks.map((b) => (b.kind === 'text' ? b.text : checklistToken(b.taskId))).join('\n');
}

/**
 * The editor shows the first line as the title, above the rest. A body that
 * starts with a checklist line gets an empty title line.
 */
export function splitTitle(body: string): { title: string; rest: string } {
  const nl = body.indexOf('\n');
  const first = nl === -1 ? body : body.slice(0, nl);
  if (TOKEN.test(first)) return { title: '', rest: body };
  return { title: first, rest: nl === -1 ? '' : body.slice(nl + 1) };
}

/** The title and the rest back into a body; a note that's only a title has no trailing line. */
export const joinTitle = (title: string, rest: string) => (rest === '' ? title : `${title}\n${rest}`);

/** The checklist lines' task ids, in order. */
export const checklistIds = (body: string) =>
  parseNoteBody(body).flatMap((b) => (b.kind === 'task' ? [b.taskId] : []));

/** Adjacent text blocks become one (their lines joined). */
export function mergeText(blocks: NoteBlock[]): NoteBlock[] {
  const out: NoteBlock[] = [];
  for (const b of blocks) {
    const last = out.at(-1);
    if (b.kind === 'text' && last?.kind === 'text') out[out.length - 1] = { kind: 'text', text: `${last.text}\n${b.text}` };
    else out.push(b);
  }
  return out;
}

/**
 * Line `line` of text block `at` becomes a checklist line for `taskId`.
 * Returns the new blocks and that line's text (the task's title-to-be).
 */
export function lineToChecklist(blocks: NoteBlock[], at: number, line: number, taskId: string): { blocks: NoteBlock[]; text: string } {
  const block = blocks[at];
  if (block?.kind !== 'text') return { blocks, text: '' };
  const lines = block.text.split('\n');
  const i = Math.min(Math.max(line, 0), lines.length - 1);
  const parts: NoteBlock[] = [];
  if (i > 0) parts.push({ kind: 'text', text: lines.slice(0, i).join('\n') });
  parts.push({ kind: 'task', taskId });
  if (i < lines.length - 1) parts.push({ kind: 'text', text: lines.slice(i + 1).join('\n') });
  return { blocks: [...blocks.slice(0, at), ...parts, ...blocks.slice(at + 1)], text: lines[i] };
}

/** Checklist line `at` goes back to plain text reading `text`, joining the text around it. */
export function checklistToLine(blocks: NoteBlock[], at: number, text: string): NoteBlock[] {
  if (blocks[at]?.kind !== 'task') return blocks;
  return mergeText([...blocks.slice(0, at), { kind: 'text', text }, ...blocks.slice(at + 1)]);
}

/** Removes checklist line `at`, joining the text around it. */
export function removeChecklistLine(blocks: NoteBlock[], at: number): NoteBlock[] {
  if (blocks[at]?.kind !== 'task') return blocks;
  return mergeText([...blocks.slice(0, at), ...blocks.slice(at + 1)]);
}

/** A new checklist line for `taskId` right after block `at`. */
export function insertChecklistLine(blocks: NoteBlock[], at: number, taskId: string): NoteBlock[] {
  return [...blocks.slice(0, at + 1), { kind: 'task', taskId }, ...blocks.slice(at + 1)];
}

/** The line a cursor offset falls on, within a block's text. */
export const lineAt = (text: string, offset: number) => text.slice(0, Math.max(0, offset)).split('\n').length - 1;

// ---------------------------------------------------------------------------
// Reading notes: title, preview, checklist progress, lists.

/** Each line as shown: text lines as typed, checklist lines as their task's title (missing tasks skipped). */
function shownLines(body: string, tasks: Map<string, Task>): string[] {
  return parseNoteBody(body).flatMap((b) => {
    if (b.kind === 'text') return b.text.split('\n');
    const t = tasks.get(b.taskId);
    return t && !t.deletedAt ? [t.title] : [];
  });
}

export interface NoteSummary {
  note: Note;
  /** The first line with words in it; empty for a blank note. */
  title: string;
  /** The next line with words in it. */
  preview: string;
  /** Checklist lines ticked of all checklist lines (only lines whose task still exists). */
  progress: { done: number; total: number };
}

export function summarizeNote(note: Note, tasks: Map<string, Task>): NoteSummary {
  const [title = '', preview = ''] = shownLines(note.body, tasks)
    .map((l) => l.trim())
    .filter(Boolean);
  const items = checklistIds(note.body)
    .map((id) => tasks.get(id))
    .filter((t): t is Task => !!t && !t.deletedAt);
  return { note, title, preview, progress: { done: items.filter((t) => t.completedAt).length, total: items.length } };
}

/**
 * Live notes, most recently edited first. `listId`: only that territory's
 * (null: notes without one); leave it out for every note.
 */
export function buildNotes(notes: Note[], tasks: Task[], listId?: string | null): NoteSummary[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return notes
    .filter((n) => !n.deletedAt && (listId === undefined || n.listId === listId))
    .sort(byRecency)
    .map((n) => summarizeNote(n, byId));
}

// ---------------------------------------------------------------------------
// Paging: notes load a page at a time, most recently edited first.

/** How many notes load at a time (Notes, a territory's notes, each Show older). */
export const NOTES_PAGE = 25;

/** Where the loaded pages end: the last note's edit time and id. */
export interface NoteCursor {
  updatedAt: ISODateTime;
  id: string;
}

/**
 * Most recently edited first, ties by id: the order the server pages in.
 * Compares code units, not locale, so timestamps and ids sort as stored
 * ("…51.65+00:00" is before "…51.650275+00:00", as in Postgres).
 */
export function byRecency(a: Pick<Note, 'updatedAt' | 'id'>, b: Pick<Note, 'updatedAt' | 'id'>): number {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? -1 : 1;
  return a.id === b.id ? 0 : a.id > b.id ? -1 : 1;
}

/** Whether a note is within the pages loaded so far (no cursor: everything is). */
export const withinPages = (note: Pick<Note, 'updatedAt' | 'id'>, end: NoteCursor | null) => !end || byRecency(note, end) <= 0;

/** Whether a body has anything in it worth keeping (words, or a checklist line). */
export const noteHasContent = (body: string) =>
  parseNoteBody(body).some((b) => b.kind === 'task' || b.text.trim() !== '');
