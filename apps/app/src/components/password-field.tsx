import { voice } from '@pn/core';
import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/components/icon';
import { noFocusRing } from '@/lib/web-styles';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.signIn;

type Props = Pick<TextInputProps, 'onSubmitEditing' | 'returnKeyType' | 'editable' | 'autoFocus' | 'placeholder'> & {
  value: string;
  onChangeText: (text: string) => void;
  /** What a screen reader says for the field. */
  label: string;
  /** A new password (Settings, sign-up, reset): password managers offer to save it. */
  isNew?: boolean;
  ref?: Ref<TextInput>;
};

/** A password with a show / hide eye, looking like the email field beside it. */
export function PasswordField({ value, onChangeText, label, isNew, ref, ...rest }: Props) {
  const s = useStyles(makeStyles);
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.box, focused && s.boxFocused]}>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        secureTextEntry={!shown}
        textContentType={isNew ? 'newPassword' : 'password'}
        autoComplete={isNew ? 'new-password' : 'current-password'}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        accessibilityLabel={label}
        placeholderTextColor={s.t.c.muted}
        style={[s.input, noFocusRing]}
        {...rest}
      />
      <Pressable
        onPress={() => setShown((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={shown ? copy.hidePassword : copy.showPassword}
        style={({ pressed }) => [s.eye, pressed && s.pressed]}>
        <Icon name={shown ? 'eyeOff' : 'eye'} size={20} color={s.t.c.muted} />
      </Pressable>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 50,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
    },
    boxFocused: { borderColor: t.c.primary, borderWidth: 1.5 },
    input: {
      flex: 1,
      alignSelf: 'stretch',
      paddingHorizontal: 14,
      color: t.c.ink,
      fontFamily: t.fonts.body,
      // 16px keeps mobile Safari from zooming into the field.
      fontSize: 16,
    },
    eye: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.6 },
  }),
});
