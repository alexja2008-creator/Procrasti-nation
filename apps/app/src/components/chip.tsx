import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = { label: string; selected?: boolean; onPress: () => void; accessibilityLabel?: string };

/** A small selectable pill: date, time, repeat and estimate choices. */
export function Chip({ label, selected, onPress, accessibilityLabel }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      // React Native Web only exposes the picked chip through aria-selected.
      aria-selected={!!selected}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [s.chip, selected && s.selected, pressed && s.pressed]}>
      <Text variant="button" color={selected ? c.onPrimary : c.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    chip: {
      minHeight: 36,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.c.outline,
      borderRadius: t.radii.pill,
      backgroundColor: t.c.bg,
    },
    selected: { backgroundColor: t.c.primary, borderColor: t.c.primary },
    pressed: { opacity: 0.7 },
  }),
});
