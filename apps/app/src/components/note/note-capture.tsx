import { noteHasContent, voice } from '@pn/core';
import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { useLists } from '@/data/lists-store';
import { useNotes } from '@/data/notes-store';
import { useAutoHeight } from '@/hooks/use-auto-height';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.capture;

/** The + sheet's Note side: a few lines, saved as a note (in `listId` when given), then ready for the next. */
export function NoteCapture({ listId }: { listId: string | null }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { save } = useNotes();
  const { lists } = useLists();
  const [text, setText] = useState('');
  const [confirmation, setConfirmation] = useState<{ text: string; failed?: boolean } | null>(null);
  const grow = useAutoHeight(text, 120);
  const ready = noteHasContent(text);

  const submit = () => {
    if (!ready) return;
    // The note shows in Notes at once; if the save fails it stays there (unsaved) and this says so.
    save(Crypto.randomUUID(), { body: text.trimEnd(), listId }).catch(() => setConfirmation({ text: voice.notes.saveFailed, failed: true }));
    setText('');
    grow.reset();
    setConfirmation({ text: copy.savedTo(lists.find((l) => l.id === listId)?.name ?? voice.notes.title) });
  };
  // ⌘↩ saves on web; Return makes a new line.
  useShortcuts({ 'Mod+Enter': submit });

  return (
    <>
      <TextInput
        value={text}
        onChangeText={(value) => {
          setText(value);
          setConfirmation(null);
        }}
        onContentSizeChange={grow.onContentSizeChange}
        multiline
        autoFocus
        placeholder={copy.notePlaceholder}
        placeholderTextColor={c.muted}
        accessibilityLabel={copy.note}
        style={[s.input, grow.style]}
      />
      <View style={s.status} accessibilityLiveRegion="polite">
        {confirmation ? (
          <Text variant="meta" color={confirmation.failed ? c.error : c.primaryText}>
            {confirmation.text}
          </Text>
        ) : null}
      </View>
      <Button label={copy.saveNote} disabled={!ready} onPress={submit} />
    </>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    input: {
      minHeight: 120,
      maxHeight: 320,
      padding: 14,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
      color: t.c.ink,
      fontFamily: t.fonts.body,
      fontSize: 16,
      lineHeight: 22,
    },
    status: { minHeight: 18, justifyContent: 'center' },
  }),
});
