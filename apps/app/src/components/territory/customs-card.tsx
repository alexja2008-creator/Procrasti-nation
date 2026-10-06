import { names, voice } from '@pn/core';
import { Pressable, Text as RNText, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = { count: number; selected?: boolean; onPress: () => void };

/** Customs at the top of the Territories tab: the dashed banner Today uses, with what's waiting. */
export function CustomsCard({ count, selected, onPress }: Props) {
  const s = useStyles(makeStyles);
  const { c, fonts } = s.t;
  const waiting = voice.territories.customsCount(count);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={`${names.customs}, ${waiting}`}
      style={({ pressed }) => [s.card, selected && s.selected, pressed && s.pressed]}>
      <Icon name="inbox" size={20} color={c.ink} />
      <Text variant="item" style={s.name}>
        {names.customs}
        <RNText style={{ fontFamily: fonts.body, color: c.muted }}>{` · ${names.customsSubtitle}`}</RNText>
      </Text>
      <Text variant="meta" color={count ? c.primaryText : c.muted}>
        {waiting}
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
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: t.c.dashed,
      borderRadius: t.radii.md,
    },
    selected: { borderColor: t.c.primary, borderStyle: 'solid' },
    name: { flex: 1 },
    pressed: { opacity: 0.7 },
  }),
});
