import { voice } from '@pn/core';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = { count: number; selected?: boolean; onPress: () => void };

/** Notes under Customs on the Territories tab: every note, in one place. */
export function NotesCard({ count, selected, onPress }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`${voice.notes.title}, ${voice.notes.count(count)}`}
      style={({ pressed }) => [s.card, selected && s.selected, pressed && s.pressed]}>
      <Icon name="pencil" size={20} color={c.ink} strokeWidth={1.8} />
      <Text variant="item" style={s.name}>
        {voice.notes.title}
      </Text>
      <Text variant="meta" color={c.muted}>
        {count || ''}
      </Text>
      <Icon name="chevronRight" size={16} color={c.muted} strokeWidth={1.8} />
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 54,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.c.rule,
      borderRadius: t.radii.md,
      backgroundColor: t.c.card,
    },
    selected: { borderColor: t.c.primary },
    name: { flex: 1 },
    pressed: { opacity: 0.7 },
  }),
});
