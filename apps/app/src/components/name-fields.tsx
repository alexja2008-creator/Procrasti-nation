import { NAME_MAX, voice } from '@pn/core';
import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { noFocusRing } from '@/lib/web-styles';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.application;

export type NameParts = { first: string; last: string };

type Props = NameParts & {
  onChange: (name: NameParts) => void;
  /** Return in the last name field (Return in the first moves on to the last). */
  onSubmit: () => void;
  editable?: boolean;
  autoFocus?: boolean;
};

/** First and last name, with the hints that let iPhone and browsers fill them in. The green border is the focus ring. */
export function NameFields({ first, last, onChange, onSubmit, editable = true, autoFocus }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const lastField = useRef<TextInput>(null);
  const [focused, setFocused] = useState<'first' | 'last' | null>(null);
  const shared = {
    placeholderTextColor: c.muted,
    maxLength: NAME_MAX,
    autoCapitalize: 'words',
    autoCorrect: false,
    spellCheck: false,
    editable,
    onBlur: () => setFocused(null),
  } as const;

  return (
    <View style={s.column}>
      <TextInput
        {...shared}
        value={first}
        onChangeText={(typed) => onChange({ first: typed, last })}
        onFocus={() => setFocused('first')}
        placeholder={copy.firstName}
        accessibilityLabel={copy.firstName}
        textContentType="givenName"
        autoComplete="given-name"
        autoFocus={autoFocus}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => lastField.current?.focus()}
        style={[s.input, noFocusRing, focused === 'first' && s.inputFocused]}
      />
      <TextInput
        {...shared}
        ref={lastField}
        value={last}
        onChangeText={(typed) => onChange({ first, last: typed })}
        onFocus={() => setFocused('last')}
        placeholder={copy.lastName}
        accessibilityLabel={copy.lastName}
        textContentType="familyName"
        autoComplete="family-name"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        style={[s.input, noFocusRing, focused === 'last' && s.inputFocused]}
      />
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    column: { gap: 10 },
    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
      color: t.c.ink,
      fontFamily: t.fonts.body,
      // 16px keeps mobile Safari from zooming into the field.
      fontSize: 16,
    },
    inputFocused: { borderColor: t.c.primary, borderWidth: 1.5 },
  }),
});
