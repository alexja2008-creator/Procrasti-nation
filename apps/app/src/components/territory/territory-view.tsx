import {
  buildNotes,
  buildTerritory,
  formatTime,
  names,
  relativeDayLabel,
  relativeDayPhrase,
  suggestsPlan,
  voice,
  type LocalDate,
  type Task,
  type TerritoryEntry,
} from '@pn/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCapture } from '@/components/capture';
import { Icon, type IconName } from '@/components/icon';
import { NoteRow, openNote } from '@/components/note/note-row';
import { ShowOlder } from '@/components/note/notes-view';
import { NoticeBar } from '@/components/notice-bar';
import { RowMenu } from '@/components/row-menu';
import { TaskRow, type TaskRowItem } from '@/components/task-row';
import { kindIcon } from '@/components/territory/territory-card';
import { TerritoryEditSheet } from '@/components/territory/territory-edit-sheet';
import { Text } from '@/components/text';
import { useLists } from '@/data/lists-store';
import { useNotePages } from '@/data/notes-store';
import { useTasks } from '@/data/tasks-store';
import { useCheckOff } from '@/hooks/use-check-off';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.territories;

function rowFor(e: TerritoryEntry, today: LocalDate, planned: Set<string>): TaskRowItem {
  const t = e.task;
  const meta: string[] = [];
  if (e.date) meta.push(t.scheduledOn ? relativeDayLabel(e.date, today) : voice.today.due(relativeDayPhrase(e.date, today)));
  if (t.scheduledOn && t.dueOn) meta.push(voice.today.due(relativeDayPhrase(t.dueOn, today)));
  if (e.steps) meta.push(copy.stepsDone(e.steps.done, e.steps.total));
  return {
    id: t.id,
    title: t.title,
    meta: meta.join(' · ') || undefined,
    rrule: t.rrule ?? undefined,
    minutes: t.estimateMinutes ?? undefined,
    time: e.at ? formatTime(new Date(e.at)) : undefined,
    suggestPlan: !t.parentId && t.source !== 'ai' && !planned.has(t.id) && suggestsPlan(t.title),
  };
}

type Props = {
  /** A territory's id, or 'customs'. */
  id: string;
  /** After the territory is deleted (go back, or pick another). */
  onDeleted?: () => void;
};

/** One territory's page (or Customs): its open tasks, Coming up then Anytime, with "+" and Edit. */
export function TerritoryView({ id, onDeleted }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, today, status, error } = useTasks();
  const { lists, status: listsStatus, error: listsError } = useLists();
  const { open: capture } = useCapture();
  const onToggle = useCheckOff();
  const [menuFor, setMenuFor] = useState<Task | null>(null);
  const [editing, setEditing] = useState(false);

  const customs = id === 'customs';
  // Customs holds tasks only; notes without a territory live on the Notes page.
  const notePages = useNotePages(customs ? null : id);
  const list = customs ? null : lists.find((l) => l.id === id);
  const view = useMemo(() => buildTerritory(customs ? null : id, tasks, today), [customs, id, tasks, today]);
  const planned = useMemo(() => new Set(tasks.flatMap((t) => (t.parentId ? [t.parentId] : []))), [tasks]);
  const notesHere = useMemo(() => buildNotes(notePages.notes, tasks), [notePages.notes, tasks]);

  if (!customs && !list) {
    return listsStatus === 'ready' ? (
      <Text variant="body" color={c.inkSoft}>
        {copy.notFound}
      </Text>
    ) : null;
  }

  const title = list ? list.name : names.customs;
  const rows = { onToggle, onMenu: (taskId: string) => setMenuFor(tasks.find((t) => t.id === taskId) ?? null) };
  const onOpen = (taskId: string) => router.push({ pathname: '/task/[id]', params: { id: taskId } });
  const onPlan = (taskId: string) => router.push({ pathname: '/plan/[id]', params: { id: taskId } });
  const empty = view.comingUp.length === 0 && view.anytime.length === 0;

  // Customs is all undated, so it needs no section heading.
  const section = (label: string | null, entries: TerritoryEntry[]) =>
    entries.length ? (
      <View>
        {label ? (
          <View style={s.sectionHead}>
            <Text variant="label" color={c.inkSoft} accessibilityRole="header">
              {label.toUpperCase()}
            </Text>
          </View>
        ) : null}
        {entries.map((e, i) => (
          <TaskRow
            key={e.task.id}
            item={rowFor(e, today, planned)}
            last={i === entries.length - 1}
            onPlan={onPlan}
            onOpen={onOpen}
            {...rows}
          />
        ))}
      </View>
    ) : null;

  const action = (icon: IconName, label: string, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.action, pressed && s.pressed]}>
      <Icon name={icon} size={20} color={c.primaryText} strokeWidth={1.9} />
    </Pressable>
  );

  return (
    <>
      <View style={s.head}>
        <View style={s.eyebrow}>
          {list ? <Icon name={kindIcon[list.kind]} size={15} color={c.stamp[list.ink]} strokeWidth={1.9} /> : null}
          <Text variant="label" color={list ? c.stamp[list.ink] : c.muted}>
            {(list ? copy.kinds[list.kind] : names.customsSubtitle).toUpperCase()}
          </Text>
        </View>
        <View style={s.titleRow}>
          <Text variant="pageTitle" accessibilityRole="header" style={s.title}>
            {title}
          </Text>
          {action('plus', copy.addTo(title), () => capture(list ? { listId: list.id } : undefined))}
          {list ? action('pencil', copy.edit, () => setEditing(true)) : null}
        </View>
        {customs ? (
          <Text variant="lead" color={c.muted}>
            {copy.customsLead}
          </Text>
        ) : null}
      </View>

      {error || listsError ? (
        <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
          {error ?? listsError}
        </Text>
      ) : null}

      <NoticeBar />

      {status === 'ready' && empty && notesHere.length === 0 ? (
        <Text variant="body" color={c.inkSoft}>
          {customs ? copy.customsEmpty : copy.empty}
        </Text>
      ) : null}
      {section(copy.comingUp, view.comingUp)}
      {section(customs ? null : copy.anytime, view.anytime)}

      {list ? (
        <View>
          <View style={[s.sectionHead, s.notesHead]}>
            <Text variant="label" color={c.inkSoft} accessibilityRole="header" style={s.grow}>
              {voice.notes.title.toUpperCase()}
            </Text>
            <Pressable
              onPress={() => openNote('new', list.id)}
              accessibilityRole="button"
              accessibilityLabel={voice.notes.newNote}
              style={({ pressed }) => [s.newNote, pressed && s.pressed]}>
              <Icon name="plus" size={16} color={c.primaryText} strokeWidth={2} />
              <Text variant="button" color={c.primaryText}>
                {voice.notes.newNote}
              </Text>
            </Pressable>
          </View>
          {notesHere.map((summary, i) => (
            <NoteRow key={summary.note.id} summary={summary} today={today} last={i === notesHere.length - 1} />
          ))}
          <ShowOlder
            more={notePages.more}
            loading={notePages.status === 'loading' && notesHere.length > 0}
            onPress={notePages.showOlder}
          />
        </View>
      ) : null}

      <RowMenu task={menuFor} onClose={() => setMenuFor(null)} />
      {editing && list ? <TerritoryEditSheet list={list} onClose={() => setEditing(false)} onDeleted={onDeleted} /> : null}
    </>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    head: { gap: 6 },
    eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 18 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    title: { flex: 1 },
    action: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    sectionHead: { minHeight: 36, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: t.c.rule },
    notesHead: { flexDirection: 'row', alignItems: 'center' },
    grow: { flex: 1 },
    newNote: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingLeft: 8 },
    pressed: { opacity: 0.7 },
  }),
});
