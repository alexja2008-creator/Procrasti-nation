import { formatShortDate, localDateString, parseSearch, relativeDayLabel, relativeDayPhrase, summarizeNote, voice, type LocalDate, type Task } from '@pn/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { NoteRow } from '@/components/note/note-row';
import { Screen } from '@/components/screen';
import { TaskRow, type TaskRowItem } from '@/components/task-row';
import { Text } from '@/components/text';
import { useLists } from '@/data/lists-store';
import type { TaskHit } from '@/data/search';
import { useTasks } from '@/data/tasks-store';
import { useCheckOff } from '@/hooks/use-check-off';
import { useSearch } from '@/hooks/use-search';
import { noFocusRing } from '@/lib/web-styles';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.search;
const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** A found task as a row: where it lives (plan, note or territory) and when. */
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

/** Search: tasks (open, then finished) and notes, as the person types. "#chem" narrows to a territory. */
export default function SearchScreen() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { lists } = useLists();
  const { tasks, today } = useTasks();
  const onToggle = useCheckOff();
  const [text, setText] = useState('');
  const { words, listId } = useMemo(() => parseSearch(text, lists), [text, lists]);
  const search = useSearch(words, listId);
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const places = useMemo(() => new Map(lists.map((l) => [l.id, l.name])), [lists]);
  const territory = lists.find((l) => l.id === listId);

  const taskGroup = (label: string, hits: TaskHit[]) =>
    hits.length ? (
      <View>
        <Text variant="label" color={c.inkSoft} accessibilityRole="header" style={s.groupHead}>
          {label.toUpperCase()}
        </Text>
        {hits.map((hit, i) => {
          // The store's copy, so a check-off shows at once.
          const task = byId.get(hit.item.id) ?? hit.item;
          return (
            <TaskRow
              key={task.id}
              item={rowFor(task, hit, today, places)}
              last={i === hits.length - 1}
              onToggle={onToggle}
              onOpen={(id) => router.push({ pathname: '/task/[id]', params: { id } })}
            />
          );
        })}
      </View>
    ) : null;

  const found = search.open.hits.length + search.done.hits.length + search.notes.hits.length;

  return (
    <Screen>
      <View style={s.column}>
        <View style={s.bar}>
          <View style={s.field}>
            <View style={s.glass}>
              <Icon name="search" size={18} color={c.muted} strokeWidth={1.9} />
            </View>
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
              placeholder={copy.placeholder}
              placeholderTextColor={c.muted}
              accessibilityLabel={copy.title}
              style={[s.t.text.body, s.input, noFocusRing]}
            />
            {search.searching ? <ActivityIndicator size="small" color={c.muted} /> : null}
          </View>
          <Button variant="quiet" label={copy.cancel} onPress={close} />
        </View>

        {search.idle ? (
          <Text variant="body" color={c.inkSoft}>
            {territory ? copy.hintIn(territory.name) : copy.hint}
          </Text>
        ) : (
          <>
            {taskGroup(copy.tasks, search.open.hits)}
            {taskGroup(copy.finished, search.done.hits)}
            {search.notes.hits.length ? (
              <View>
                <Text variant="label" color={c.inkSoft} accessibilityRole="header" style={s.groupHead}>
                  {copy.notes.toUpperCase()}
                </Text>
                {search.notes.hits.map((hit, i) => (
                  <NoteRow
                    key={hit.item.id}
                    summary={summarizeNote(hit.item, byId)}
                    today={today}
                    territory={hit.item.listId ? places.get(hit.item.listId) : undefined}
                    last={i === search.notes.hits.length - 1}
                  />
                ))}
              </View>
            ) : null}
            {!search.searching && !search.failed && found === 0 ? (
              <Text variant="body" color={c.inkSoft}>
                {territory ? copy.noMatchesIn(words, territory.name) : copy.noMatches(words)}
              </Text>
            ) : null}
            {search.failed ? (
              <Text variant="body" color={c.error} accessibilityLiveRegion="polite">
                {copy.failed}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 16 },
    bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    field: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 44,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
    },
    glass: { width: 18, height: 18 },
    // minWidth 0: a web input otherwise keeps its default width and squeezes the icon out.
    input: { flex: 1, minWidth: 0, color: t.c.ink, paddingVertical: 10 },
    groupHead: { minHeight: 36, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: t.c.rule },
  }),
});
