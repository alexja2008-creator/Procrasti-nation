import { localDateString, relativeDayPhrase, voice, type LocalDate, type NoteSummary } from '@pn/core';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.notes;

/** Opens a note, or (with 'new') a blank one, filed in `listId` if given. */
export const openNote = (id: string, listId?: string | null) =>
  router.push({ pathname: '/note/[id]', params: listId ? { id, list: listId } : { id } });

type Props = {
  summary: NoteSummary;
  today: LocalDate;
  territory?: string;
  last?: boolean;
  /** Shown in place of the next line, e.g. search's snippet of where it matched. */
  snippet?: ReactNode;
};

/** A note in a list: its title, next line, and where and when it was last touched. */
export function NoteRow({ summary, today, territory, last, snippet }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { note, title, preview, progress } = summary;
  const edited = copy.edited(relativeDayPhrase(localDateString(new Date(note.updatedAt)), today));
  const meta = [territory, progress.total ? copy.progress(progress.done, progress.total) : null, edited].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => openNote(note.id)}
      accessibilityRole="button"
      accessibilityLabel={`${title || copy.untitled}. ${preview} ${meta}`}
      style={({ pressed }) => [s.row, !last && s.rule, pressed && s.pressed]}>
      <View style={s.icon}>
        <Icon name="pencil" size={17} color={c.muted} strokeWidth={1.8} />
      </View>
      <View style={s.text}>
        <Text variant="item" numberOfLines={1}>
          {title || copy.untitled}
        </Text>
        {snippet ? (
          snippet
        ) : preview ? (
          <Text variant="meta" color={c.inkSoft} numberOfLines={1}>
            {preview}
          </Text>
        ) : null}
        <Text variant="meta" color={c.muted} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 10 },
    rule: { borderBottomWidth: 1, borderBottomColor: t.c.rule },
    // Lines up with a task row's checkbox column.
    icon: { width: t.hitTarget, alignItems: 'center', paddingTop: 2 },
    text: { flex: 1, gap: 2 },
    pressed: { opacity: 0.7 },
  }),
});
