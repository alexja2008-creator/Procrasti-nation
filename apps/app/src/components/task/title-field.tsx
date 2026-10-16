import { voice } from '@pn/core';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { Icon } from '@/components/icon';
import { noFocusRing } from '@/lib/web-styles';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = {
  value: string;
  onChange: (text: string) => void;
  /** Leaving the field saves it. */
  onDone: () => void;
  done: boolean;
};

/**
 * A task's title, renamed where it stands. It looked like plain text, so family
 * testers never found it (2026-10-15): a button beside it focuses it (the rename
 * glyph, since the pencil just below is Declare's), and it's underlined on hover
 * and while it's being typed in.
 */
export function TitleField({ value, onChange, onDone, done }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const input = useRef<TextInput>(null);
  // Multiline inputs don't grow by themselves on web; size it to its text.
  const [height, setHeight] = useState(0);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChange}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          onDone();
        }}
        onContentSizeChange={(e) => setHeight(e.nativeEvent.contentSize.height)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        multiline
        submitBehavior="blurAndSubmit"
        returnKeyType="done"
        placeholder={voice.task.titlePlaceholder}
        placeholderTextColor={c.muted}
        accessibilityLabel={voice.task.titlePlaceholder}
        // The underline is its focus mark, so the browser's box would draw it twice.
        style={[s.t.text.pageTitle, s.title, noFocusRing, done && s.done, hovered && s.hovered, editing && s.editing, height ? { height: height + 10 } : null]}
      />
      <Pressable
        onPress={() => input.current?.focus()}
        accessibilityRole="button"
        accessibilityLabel={voice.task.rename}
        style={({ pressed }) => [s.pencil, pressed && s.pressed]}>
        <Icon name="rename" size={18} color={editing ? c.primaryText : c.muted} strokeWidth={1.9} />
      </Pressable>
    </>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    title: { flex: 1, color: t.c.ink, paddingTop: 6, paddingBottom: 4, borderBottomWidth: 1.5, borderBottomColor: 'transparent' },
    done: { color: t.c.muted },
    hovered: { borderBottomColor: t.c.rule },
    editing: { borderBottomColor: t.c.primary },
    pencil: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.7 },
  }),
});
