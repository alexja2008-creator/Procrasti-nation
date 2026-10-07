import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = { label: string; value: string; onPress: () => void; last?: boolean };

/** "Your hours        Night owl  ›": one setting on a Settings card. */
export function SettingRow({ label, value, onPress, last }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [s.row, !last && s.rule, pressed && s.pressed]}>
      <Text variant="item" style={s.label}>
        {label}
      </Text>
      <Text variant="body" color={c.inkSoft} style={s.value} numberOfLines={1}>
        {value}
      </Text>
      <Icon name="chevronRight" size={16} color={c.muted} strokeWidth={1.8} />
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
    rule: { borderBottomWidth: 1, borderBottomColor: t.c.rule },
    label: { flexShrink: 0 },
    value: { flex: 1, textAlign: 'right' },
    pressed: { opacity: 0.7 },
  }),
});
