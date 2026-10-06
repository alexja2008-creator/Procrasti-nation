import {
  checklistToLine,
  insertChecklistLine,
  lineAt,
  lineToChecklist,
  parseNoteBody,
  parseQuickAdd,
  removeChecklistLine,
  scheduleOf,
  serializeNoteBody,
  voice,
  type NoteBlock,
  type Task,
} from '@pn/core';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useImperativeHandle, useMemo, useRef, type Ref } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ChecklistRow } from '@/components/note/checklist-row';
import { useLists } from '@/data/lists-store';
import { useTasks } from '@/data/tasks-store';
import { useAutoHeight } from '@/hooks/use-auto-height';
import { noFocusRing, oneRowOnWeb } from '@/lib/web-styles';
import { useStyles, type Tokens } from '@/theme/tokens';

export type NoteEditorHandle = {
  /** Focus the first line under the title. */
  focusStart: () => void;
  /** ☐: the line the cursor is on becomes a checklist line, or goes back to text. */
  toggleChecklist: () => void;
  /** Checklist lines' words as they stand, typing included (a line saves its words when it's left). */
  wordsOf: (taskId: string) => string | undefined;
};

type Props = {
  /** The body under the title. */
  rest: string;
  onChange: (rest: string) => void;
  /**
   * Saves the note now with `rest` and settles once it exists (a checklist
   * line's task can only be saved after its note).
   */
  saveNow: (rest: string) => Promise<void>;
  noteId: string;
  /** The note's territory: new checklist tasks are filed there. */
  listId: string | null;
  ref?: Ref<NoteEditorHandle>;
};

/** A stable key per block: checklist lines by task, text by the line before it. */
const keyAt = (blocks: NoteBlock[], i: number) => {
  const b = blocks[i];
  if (!b) return '';
  if (b.kind === 'task') return `t:${b.taskId}`;
  const prev = blocks[i - 1];
  return prev?.kind === 'task' ? `x:${prev.taskId}` : 'x:start';
};

/** Puts the caret at `at` (focus alone leaves it at the end on iOS, the start on web). */
const placeCaret = (input: TextInput, at: number) => {
  if (Platform.OS === 'web') (input as unknown as HTMLTextAreaElement).setSelectionRange(at, at);
  else input.setSelection(at, at);
};

/**
 * The note's body as blocks: text paragraphs and live checklist lines. A
 * checklist line is a real task (tick it here or anywhere); a new one is read
 * like quick add ("read ch 5 fri" → Fri).
 */
export function NoteEditor({ rest, onChange, saveNow, noteId, listId, ref }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, today, toggle, update, addToNote, setDeletedMany } = useTasks();
  const { lists } = useLists();
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const blocks = useMemo(() => parseNoteBody(rest), [rest]);

  const inputs = useRef(new Map<string, TextInput>());
  // The block the cursor was last in (by key) and, for text, where in it.
  const focused = useRef<{ key: string; offset: number } | null>(null);
  // After a change of structure, where the cursor goes once it renders: a block (by key) and a place in it.
  const focusNext = useRef<{ key: string; at: number | 'end' } | null>(null);
  // Words being typed in checklist lines, not yet saved to their tasks.
  const drafts = useRef(new Map<string, string>());
  // Tasks whose lines were taken out here: a line saving its words as it goes mustn't revive them.
  const gone = useRef(new Set<string>());
  // Lines made checklist lines here, as typed: ☐ again (title untouched) gives the words back, "fri" and all.
  const typed = useRef(new Map<string, { text: string; title: string }>());

  useEffect(() => {
    const next = focusNext.current;
    if (!next) return;
    focusNext.current = null;
    const input = inputs.current.get(next.key);
    if (!input) return;
    const b = blocks.find((_, j) => keyAt(blocks, j) === next.key);
    const end = b?.kind === 'text' ? b.text.length : b ? (byId.get(b.taskId)?.title.length ?? 0) : 0;
    input.focus();
    placeCaret(input, next.at === 'end' ? end : next.at);
  });

  const emit = (next: NoteBlock[]) => {
    const body = serializeNoteBody(next);
    onChange(body);
    return body;
  };

  /** A checklist line's task, read like quick add when it has words. Returns its title. */
  const createTask = (taskId: string, text: string, body: string) => {
    const words = text.trim();
    const parsed = words ? parseQuickAdd(words, new Date(), { lists }) : null;
    const fields = parsed ? { title: parsed.title, ...scheduleOf(parsed), listId: parsed.listId ?? listId } : { title: '', listId };
    addToNote({ id: taskId, noteId, ...fields }, saveNow(body));
    return fields.title;
  };
  const deleteTask = (taskId: string) => {
    gone.current.add(taskId);
    drafts.current.delete(taskId);
    setDeletedMany([taskId], new Date().toISOString()).catch(() => undefined);
  };

  /** A line's words saved to its task; a line's first words are read like quick add. */
  const commit = (task: Task, title: string) => {
    const words = title.trim();
    if (words === task.title || gone.current.has(task.id)) return;
    if (!task.title && words) {
      const p = parseQuickAdd(words, new Date(), { lists });
      update(task, { title: p.title, ...scheduleOf(p), ...(p.listId ? { listId: p.listId } : {}) });
    } else {
      update(task, { title: words });
    }
  };

  const toChecklist = (i: number, line: number) => {
    const taskId = Crypto.randomUUID();
    const { blocks: next, text } = lineToChecklist(blocks, i, line, taskId);
    typed.current.set(taskId, { text, title: createTask(taskId, text, emit(next)) });
    focusNext.current = { key: `t:${taskId}`, at: 'end' };
  };

  /** Checklist line `i` back to text (or an empty line), its task gone. */
  const toText = (i: number, text: string) => {
    const b = blocks[i];
    if (b?.kind !== 'task') return;
    const next = checklistToLine(blocks, i, text);
    emit(next);
    deleteTask(b.taskId);
    // The line is now in the text block that took its place, after the text before it (if any).
    const prev = blocks[i - 1];
    focusNext.current =
      prev?.kind === 'text' ? { key: keyAt(next, i - 1), at: prev.text.length + 1 + text.length } : { key: keyAt(next, i), at: text.length };
  };

  const onReturn = (i: number, task: Task, title: string, carried: string) => {
    // Return on an empty checklist line ends the checklist.
    if (!title.trim() && !carried) return toText(i, '');
    commit(task, title);
    const taskId = Crypto.randomUUID();
    const next = insertChecklistLine(blocks, i, taskId);
    createTask(taskId, carried, emit(next));
    focusNext.current = { key: `t:${taskId}`, at: 0 };
  };

  const onBackspaceEmpty = (i: number) => {
    const b = blocks[i];
    if (b?.kind !== 'task') return;
    const next = removeChecklistLine(blocks, i);
    emit(next);
    deleteTask(b.taskId);
    // To the end of the line before (not the end of any text joined after it).
    const prev = blocks[i - 1];
    focusNext.current = { key: keyAt(next, Math.max(0, i - 1)), at: prev?.kind === 'text' ? prev.text.length : prev ? 'end' : 0 };
  };

  useImperativeHandle(ref, () => ({
    focusStart: () => inputs.current.get(keyAt(blocks, 0))?.focus(),
    toggleChecklist: () => {
      const f = focused.current;
      const i = f ? blocks.findIndex((_, j) => keyAt(blocks, j) === f.key) : -1;
      const b = blocks[i];
      if (f && b?.kind === 'text') return toChecklist(i, lineAt(b.text, f.offset));
      if (b?.kind === 'task') {
        const title = drafts.current.get(b.taskId) ?? byId.get(b.taskId)?.title ?? '';
        const was = typed.current.get(b.taskId);
        return toText(i, was?.title === title ? was.text : title);
      }
      // Nowhere in particular: a new checklist line at the end.
      const taskId = Crypto.randomUUID();
      createTask(taskId, '', emit([...blocks, { kind: 'task', taskId }]));
      focusNext.current = { key: `t:${taskId}`, at: 0 };
    },
    wordsOf: (taskId) => drafts.current.get(taskId) ?? byId.get(taskId)?.title,
  }));

  return (
    <View style={s.editor}>
      {blocks.map((b, i) => {
        const key = keyAt(blocks, i);
        const register = (input: TextInput | null) => {
          if (input) inputs.current.set(key, input);
          else inputs.current.delete(key);
        };
        if (b.kind === 'task') {
          const task = byId.get(b.taskId);
          // A line whose task was deleted elsewhere stays out of sight (Undo brings it back).
          if (!task || task.deletedAt) return null;
          return (
            <ChecklistRow
              key={key}
              task={task}
              today={today}
              inputRef={register}
              onFocus={() => (focused.current = { key, offset: 0 })}
              onToggle={() => toggle(task)}
              onReturn={(title, carried) => onReturn(i, task, title, carried)}
              onBackspaceEmpty={() => onBackspaceEmpty(i)}
              onCommit={(title) => commit(task, title)}
              onDraft={(text) => (text === null ? drafts.current.delete(task.id) : drafts.current.set(task.id, text))}
              onOpen={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
            />
          );
        }
        const only = blocks.length === 1;
        return (
          <TextBlock
            key={key}
            ref={register}
            value={b.text}
            minHeight={only ? 160 : 0}
            onChangeText={(text) => emit(blocks.map((x, j) => (j === i ? { kind: 'text', text } : x)))}
            onFocus={() => (focused.current = { key, offset: focused.current?.key === key ? focused.current.offset : b.text.length })}
            onSelectionChange={(e) => (focused.current = { key, offset: e.nativeEvent.selection.start })}
            placeholder={only ? voice.notes.placeholder : undefined}
            placeholderTextColor={c.muted}
            style={[s.t.text.lead, s.text]}
          />
        );
      })}
    </View>
  );
}

/** A run of text lines in a note: grows with its text. */
function TextBlock({ value, minHeight, style, ref, ...props }: TextInputProps & { value: string; minHeight: number; ref: Ref<TextInput> }) {
  const grow = useAutoHeight(value, minHeight);
  return (
    <TextInput
      ref={ref}
      value={value}
      onContentSizeChange={grow.onContentSizeChange}
      multiline
      scrollEnabled={false}
      {...oneRowOnWeb}
      accessibilityLabel={voice.notes.title}
      style={[style, noFocusRing, grow.style]}
      {...props}
    />
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    editor: { gap: 0 },
    text: { color: t.c.ink, padding: 0, paddingVertical: 2, textAlignVertical: 'top' },
  }),
});
