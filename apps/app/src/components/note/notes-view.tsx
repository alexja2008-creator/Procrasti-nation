import { buildNotes, voice } from '@pn/core';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { NoteRow, openNote } from '@/components/note/note-row';
import { NoticeBar } from '@/components/notice-bar';
import { Text } from '@/components/text';
import { useLists } from '@/data/lists-store';
import { useNotePages, useNotes } from '@/data/notes-store';
import { useTasks } from '@/data/tasks-store';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.notes;

/** Every note, most recently edited first, 25 at a time, with New note. */
export function NotesView() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, today } = useTasks();
  const { lists } = useLists();
  const { error, refresh } = useNotes();
  const { notes, more, status, showOlder } = useNotePages('all');
  const summaries = useMemo(() => buildNotes(notes, tasks), [notes, tasks]);
  const territory = (id: string | null) => lists.find((l) => l.id === id)?.name;

  return (
    <>
      <View style={s.head}>
        <Text variant="label" color={c.muted}>
          {voice.territories.eyebrow.toUpperCase()}
        </Text>
        <View style={s.titleRow}>
          <Text variant="pageTitle" accessibilityRole="header" style={s.title}>
            {copy.title}
          </Text>
          <Pressable
            onPress={() => openNote('new')}
            accessibilityRole="button"
            accessibilityLabel={copy.newNote}
            style={({ pressed }) => [s.action, pressed && s.pressed]}>
            <Icon name="plus" size={20} color={c.primaryText} strokeWidth={1.9} />
          </Pressable>
        </View>
        <Text variant="lead" color={c.muted}>
          {copy.lead}
        </Text>
      </View>

      {error ? (
        <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <NoticeBar />

      {status === 'loading' && notes.length === 0 ? <ActivityIndicator color={c.primary} /> : null}
      {status === 'error' ? (
        <View style={s.failed}>
          <Text variant="body" color={c.inkSoft}>
            {copy.loadFailed}
          </Text>
          <Button variant="secondary" label={voice.today.retry} onPress={refresh} />
        </View>
      ) : null}

      {status === 'ready' && summaries.length === 0 ? (
        <Text variant="body" color={c.inkSoft}>
          {copy.empty}
        </Text>
      ) : (
        <View>
          {summaries.map((summary, i) => (
            <NoteRow
              key={summary.note.id}
              summary={summary}
              today={today}
              territory={territory(summary.note.listId)}
              last={i === summaries.length - 1}
            />
          ))}
          <ShowOlder more={more} loading={status === 'loading' && notes.length > 0} onPress={showOlder} />
        </View>
      )}
    </>
  );
}

/** The next 25 notes, while there are older ones. */
export function ShowOlder({ more, loading, onPress }: { more: boolean; loading: boolean; onPress: () => void }) {
  const s = useStyles(makeStyles);
  if (!more) return null;
  return (
    <View style={s.older}>
      {loading ? <ActivityIndicator color={s.t.c.primary} /> : <Button variant="secondary" label={copy.showOlder} onPress={onPress} />}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    head: { gap: 6 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    title: { flex: 1 },
    action: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    failed: { gap: 10, alignItems: 'flex-start' },
    older: { paddingTop: 12, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.7 },
  }),
});
