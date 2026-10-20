import { voice } from '@pn/core';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.declaration;

/**
 * An empty stamp slot on a row that has no Declaration yet (Alex, 2026-10-20): where STAMPED and
 * DECLARED sit, a dashed outline asks "Declare a start time?" and opens the Declare sheet.
 * Straight, not tilted: it isn't stamped yet.
 */
export function DeclareInvite({ title, onPress }: { title: string; onPress: () => void }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={copy.inviteLabel(title)}
      style={({ pressed }) => [s.target, pressed && s.pressed]}>
      <View style={s.slot}>
        <Text variant="labelSmall" color={c.stamp.violet} style={s.text}>
          {copy.invite.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    target: { minHeight: t.hitTarget, justifyContent: 'center', alignItems: 'flex-end' },
    // Narrow enough to break into two lines, like a stamp, and leave the title its room on a phone.
    slot: {
      maxWidth: 96,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.c.stamp.violet,
      borderRadius: t.radii.chip,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    text: { textAlign: 'center' },
    pressed: { opacity: 0.7 },
  }),
});
