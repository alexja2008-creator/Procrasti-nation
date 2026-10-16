import { voice } from '@pn/core';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { useStyles, type Tokens } from '@/theme/tokens';

// The web's modal focuses itself as it opens, after autoFocus: take the cursor back once it has.
const FOCUS_AFTER_OPEN_MS = 100;

type Props = {
  title: string;
  /** Called with the new title only when it changed and isn't empty. */
  onRename: (title: string) => void;
  onClose: () => void;
};

/** The row menu's Rename…: the title in one field, saved with Save or Return. */
export function RenameSheet({ title, onRename, onClose }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [text, setText] = useState(title);
  const trimmed = text.trim();
  const input = useRef<TextInput>(null);
  useEffect(() => {
    const id = setTimeout(() => input.current?.focus(), FOCUS_AFTER_OPEN_MS);
    return () => clearTimeout(id);
  }, []);
  const save = () => {
    if (!trimmed) return;
    if (trimmed !== title) onRename(trimmed);
    onClose();
  };

  return (
    <Sheet
      title={voice.task.rename}
      onClose={onClose}
      width={420}
      footer={<Button label={voice.task.save} disabled={!trimmed} onPress={save} />}>
      <TextInput
        ref={input}
        value={text}
        onChangeText={setText}
        onSubmitEditing={save}
        autoFocus
        selectTextOnFocus
        placeholder={voice.task.titlePlaceholder}
        placeholderTextColor={c.muted}
        accessibilityLabel={voice.task.rename}
        returnKeyType="done"
        style={[s.t.text.body, s.input]}
      />
    </Sheet>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    input: {
      minHeight: t.hitTarget,
      paddingHorizontal: 12,
      marginVertical: 6,
      color: t.c.ink,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
    },
  }),
});
