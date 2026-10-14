import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  /** primary: forest fill · secondary: outlined card · quiet: text only. */
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  /** Leading mark (e.g. a provider logo). */
  icon?: ReactNode;
  accessibilityHint?: string;
};

/** Plain-labelled action button (the theme lives in the world, never in the controls). */
export function Button({ label, onPress, variant = 'primary', disabled, icon, accessibilityHint }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const color = variant === 'primary' ? c.onPrimary : variant === 'quiet' ? c.primaryText : c.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [s.base, s[variant], disabled && s.disabled, pressed && !disabled && s.pressed]}>
      {icon ? <View style={s.icon}>{icon}</View> : null}
      <Text variant="item" color={color} style={s.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    base: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 18,
      borderRadius: t.radii.lg,
    },
    primary: { backgroundColor: t.c.primary },
    secondary: { backgroundColor: t.c.field.bg, borderWidth: 1, borderColor: t.c.field.border },
    quiet: { minHeight: t.hitTarget, paddingHorizontal: 8 },
    icon: { width: 20, alignItems: 'center' },
    label: { fontFamily: t.fonts.bodySemibold },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.75 },
  }),
});
