import {
  formatShortDate,
  localDateString,
  relativeDayLabel,
  relativeDayPhrase,
  summarizeNote,
  voice,
  type LocalDate,
  type Note,
  type Task,
} from '@pn/core';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NoteRow, openNote } from '@/components/note/note-row';
import { Highlighted } from '@/components/search/highlighted';
import { TaskRow, type TaskRowItem } from '@/components/task-row';
import { Text } from '@/components/text';
import type { Hit, HitPage, TaskHit } from '@/data/search';
import { useTasks } from '@/data/tasks-store';
import { useCheckOff } from '@/hooks/use-check-off';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.search;

/** A found task as a row: where it lives (its plan, note or territory) and when. */
function rowFor(task: Task, hit: TaskHit, today: LocalDate, places: Map<string, string>): TaskRowItem {
  const meta: string[] = [];
  const place = hit.plan ?? (task.noteId ? hit.note : null) ?? (task.listId ? places.get(task.listId) : undefined);
  if (place) meta.push(place);
  if (task.completedAt) {
    meta.push(copy.done(relativeDayPhrase(localDateString(new Date(task.completedAt)), today)));
  } else {
    if (task.scheduledOn) meta.push(relativeDayLabel(task.scheduledOn, today));
    if (task.dueOn) meta.push(voice.today.due(formatShortDate(task.dueOn)));
  }
  return { id: task.id, title: task.title, meta: meta.join(' · ') || undefined, rrule: task.rrule ?? undefined, done: !!task.completedAt };
}

function Head({ label }: { label: string }) {
  const s = useStyles(makeStyles);
  return (
    <Text variant="label" color={s.t.c.inkSoft} accessibilityRole="header" style={s.head}>
      {label.toUpperCase()}
    </Text>
  );
}

function ShowMore({ more, loading, onPress }: { more: boolean; loading: boolean; onPress: () => void }) {
  const s = useStyles(makeStyles);
  if (!more) return null;
  return (
    <View style={s.more}>
      {loading ? <ActivityIndicator color={s.t.c.primary} /> : <Button variant="secondary" label={copy.showMore} onPress={onPress} />}
    </View>
  );
}

type GroupProps<H> = { label: string; page: HitPage<H>; loading: boolean; onMore: () => void; places: Map<string, string> };

/**
 * Found tasks. They check off like anywhere else (with Undo); a tap opens
 * the task, or for a checklist line its note, where it lives.
 */
export function TaskGroup({ label, page, loading, onMore, places }: GroupProps<TaskHit>) {
  const { tasks, today } = useTasks();
  const onToggle = useCheckOff();
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  if (page.hits.length === 0) return null;
  return (
    <View>
      <Head label={label} />
      {page.hits.map((hit, i) => {
        // The store's copy, so a check-off shows at once.
        const task = byId.get(hit.item.id) ?? hit.item;
        return (
          <TaskRow
            key={task.id}
            item={rowFor(task, hit, today, places)}
            last={i === page.hits.length - 1 && !page.more}
            onToggle={onToggle}
            onOpen={() => (task.noteId ? openNote(task.noteId) : router.push({ pathname: '/task/[id]', params: { id: task.id } }))}
            detail={hit.snippet ? <Highlighted snippet={hit.snippet} /> : undefined}
          />
        );
      })}
      <ShowMore more={page.more} loading={loading} onPress={onMore} />
    </View>
  );
}

/** Found notes, each with a snippet of where it matched. */
export function NoteGroup({ label, page, loading, onMore, places }: GroupProps<Hit<Note>>) {
  const { tasks, today } = useTasks();
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  if (page.hits.length === 0) return null;
  return (
    <View>
      <Head label={label} />
      {page.hits.map((hit, i) => (
        <NoteRow
          key={hit.item.id}
          summary={summarizeNote(hit.item, byId)}
          today={today}
          territory={hit.item.listId ? places.get(hit.item.listId) : undefined}
          last={i === page.hits.length - 1 && !page.more}
          snippet={hit.snippet ? <Highlighted snippet={hit.snippet} /> : undefined}
        />
      ))}
      <ShowMore more={page.more} loading={loading} onPress={onMore} />
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    head: { minHeight: 36, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: t.c.rule },
    more: { paddingTop: 12, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  }),
});
