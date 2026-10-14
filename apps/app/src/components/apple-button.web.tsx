import { voice } from '@pn/core';
import { Pressable, StyleSheet } from 'react-native';

import { AppleMark } from '@/components/brand-marks';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

/** Web Sign in with Apple, styled to Apple's guidelines (no native button on web). */
export function AppleButton({ onPress }: { onPress: () => void }) {
  const s = useStyles(makeStyles);
  const { apple } = s.t.c;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.button, pressed && s.pressed]}>
      <AppleMark color={apple.fg} />
      <Text variant="item" color={apple.fg} style={s.label}>
        {voice.signIn.continueWithApple}
      </Text>
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    button: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.apple.bg,
    },
    label: { fontFamily: t.fonts.bodySemibold },
    pressed: { opacity: 0.8 },
  }),
});
