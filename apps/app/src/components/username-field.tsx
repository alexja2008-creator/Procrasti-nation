import { cleanUsername, looksLikeEmail, USERNAME_MAX, voice } from '@pn/core';
import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/text';
import type { UsernameStatus } from '@/hooks/use-username-check';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.signIn;

type Props = Pick<TextInputProps, 'onSubmitEditing' | 'returnKeyType' | 'submitBehavior' | 'editable' | 'autoFocus'> & {
  value: string;
  onChange: (username: string) => void;
  /**
   * An email typed here ("dad@…") goes to the caller whole (Save your passport moves it). With it,
   * the box shows what's typed, cleaned to a username only on leaving the box, so the address
   * arrives with its dots and +tag; the caller cleans it for the check and the save.
   */
  onEmail?: (typed: string) => void;
  status: UsernameStatus;
  ref?: Ref<TextInput>;
};

/**
 * A username as it's typed (lowercase; letters, digits, underscores), with whether it's free under
 * it. With `onEmail`, the box shows exactly what's typed until it's left.
 */
export function UsernameField({ value, onChange, onEmail, status, ref, ...rest }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [focused, setFocused] = useState(false);
  // The username the status line is about (the box may still show what was typed).
  const shown = onEmail ? cleanUsername(value) : value;
  const [line, color] =
    status === 'checking'
      ? [copy.usernameChecking, c.muted]
      : status === 'free'
        ? [copy.usernameFree(shown), c.primaryText]
        : status === 'taken'
          ? [copy.usernameTaken(shown), c.error]
          : [copy.usernameHint, c.muted];
  return (
    <View style={s.column}>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(typed) => {
          if (!onEmail) return onChange(cleanUsername(typed));
          if (looksLikeEmail(typed)) return onEmail(typed.trim());
          onChange(typed);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (onEmail) onChange(cleanUsername(value));
        }}
        placeholder={copy.usernamePlaceholder}
        placeholderTextColor={c.muted}
        // Uncut while it may be an email being typed; the username is cut to the limit when cleaned.
        maxLength={onEmail ? undefined : USERNAME_MAX}
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
