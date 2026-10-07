import { cleanUsername, USERNAME_MAX, voice } from '@pn/core';
import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/text';
import type { UsernameStatus } from '@/hooks/use-username-check';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.signIn;

type Props = Pick<TextInputProps, 'onSubmitEditing' | 'returnKeyType' | 'submitBehavior' | 'editable' | 'autoFocus'> & {
  value: string;
  onChange: (username: string) => void;
  status: UsernameStatus;
  ref?: Ref<TextInput>;
};

/** A username as it's typed (lowercase; letters, digits, underscores), with whether it's free under it. */
export function UsernameField({ value, onChange, status, ref, ...rest }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [focused, setFocused] = useState(false);
  const [line, color] =
    status === 'checking'
      ? [copy.usernameChecking, c.muted]
      : status === 'free'
        ? [copy.usernameFree(value), c.primaryText]
        : status === 'taken'
          ? [copy.usernameTaken(value), c.error]
          : [copy.usernameHint, c.muted];
  return (
    <View style={s.column}>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(typed) => onChange(cleanUsername(typed))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={copy.usernamePlaceholder}
        placeholderTextColor={c.muted}
        maxLength={USERNAME_MAX}
        textContentType="nickname"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        accessibilityLabel={copy.usernameLabelSpoken}
        style={[s.input, focused && s.inputFocused]}
        {...rest}
      />
      <Text variant="meta" color={color} accessibilityLiveRegion="polite">
        {line}
      </Text>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    column: { gap: 6 },
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
