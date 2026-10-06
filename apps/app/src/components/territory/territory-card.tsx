import { formatTime, relativeDayLabel, voice, type ListKind, type LocalDate, type TerritorySummary } from '@pn/core';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.territories;

export const kindIcon: Record<ListKind, IconName> = { school: 'book', work: 'briefcase', home: 'house', custom: 'flag' };

/** "Fri", "Today 7:00 AM", "Mon 19 Oct". */
export function whenLabel(date: LocalDate, at: string | null, today: LocalDate): string {
  const day = relativeDayLabel(date, today);
  return at ? `${day} ${formatTime(new Date(at))}` : day;
}

type Props = {
  summary: TerritorySummary;
  /** How many notes are filed here. */
  notes?: number;
  today: LocalDate;
  selected?: boolean;
  onPress: () => void;
  /** A drag handle, in place of the chevron, when there's an order to change. */
  handle?: ReactNode;
  /** VoiceOver's Move up / Move down. */
  actions?: Pick<PressableProps, 'accessibilityActions' | 'onAccessibilityAction'>;
};

/** A territory on the Territories tab: its ink, name, open count and next dated item. */
export function TerritoryCard({ summary, notes = 0, today, selected, onPress, handle, actions }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { list, open, next } = summary;
  const ink = c.stamp[list.ink];
  const meta = [
    copy.open(open),
    notes ? voice.notes.count(notes) : null,
    next?.date ? copy.next(whenLabel(next.date, next.at, today), next.task.title) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={[s.card, selected && s.selected]}>
      <View style={[s.stripe, { backgroundColor: ink }]} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: !!selected }}
        accessibilityLabel={`${list.name}, ${meta}`}
        {...actions}
        style={({ pressed }) => [s.main, pressed && s.pressed]}>
        <Icon name={kindIcon[list.kind]} size={20} color={ink} strokeWidth={1.8} />
        <View style={s.text}>
          <Text variant="item" numberOfLines={1}>
            {list.name}
          </Text>
          <Text variant="meta" color={c.muted} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        {handle ? null : <Icon name="chevronRight" size={16} color={c.muted} strokeWidth={1.8} />}
      </Pressable>
      {handle}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 62,
      borderRadius: t.radii.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      backgroundColor: t.c.card,
      overflow: 'hidden',
    },
    selected: { borderColor: t.c.primary },
    stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
    main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingLeft: 18, paddingRight: 12 },
    text: { flex: 1, gap: 2 },
    pressed: { opacity: 0.75 },
  }),
});
