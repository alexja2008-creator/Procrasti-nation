import { voice } from '@pn/core';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = {
  title: string;
  meta: string;
  index: number;
  total: number;
  aiBuilt?: boolean;
  onStart?: () => void;
};

/** "Your next small step": a ticket with a perforated stub holding Start. */
export function NextStepCard({ title, meta, index, total, aiBuilt, onStart }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <View style={s.card} accessibilityLabel={voice.nextStepLabel} accessibilityRole="summary">
      <View style={s.body}>
        <View style={s.headRow}>
          <Text variant="label" color={c.primaryText}>
            {voice.nextStepLabel.toUpperCase()}
          </Text>
          <View style={s.counter}>
            <Text variant="labelSmall" color={c.primaryText}>
              {index} OF {total}
            </Text>
          </View>
        </View>
        <Text variant="step">{title}</Text>
        <Text variant="meta" color={c.next.meta} style={s.meta}>
          {meta}
        </Text>
        {aiBuilt && (
          <View style={s.tag}>
            <Icon name="shrink" size={13} color={c.primaryText} strokeWidth={2} />
            <Text variant="meta" color={c.primaryText} style={s.tagText}>
              {voice.madeSmaller}
            </Text>
          </View>
        )}
      </View>

      <View style={s.stub}>
        {/* Perforation: RN can't dash a single border side on iOS, so draw it. */}
        <Svg width={2} height="100%" style={StyleSheet.absoluteFill}>
          <Line x1={0.75} y1={0} x2={0.75} y2="100%" stroke={c.next.stub} strokeWidth={1.5} strokeDasharray="4 3" />
        </Svg>
        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel={`Start: ${title}`}
          style={({ pressed }) => [s.start, pressed && s.pressed]}>
          <Text variant="step" color={c.onPrimary} style={s.startText}>
            Start
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: t.c.next.bg,
      borderWidth: 1,
      borderColor: t.c.next.border,
      borderRadius: t.radii.card,
      overflow: 'hidden',
    },
    body: { flex: 1, padding: 16, gap: 9 },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    counter: {
      borderWidth: 1,
      borderColor: t.c.next.stub,
      borderRadius: t.radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    meta: { fontSize: 13 },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    tagText: { fontSize: 12 },
    stub: { width: 92, alignItems: 'center', justifyContent: 'center' },
    start: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: t.c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startText: { fontFamily: t.fonts.displayItalic, fontSize: 17, lineHeight: 22 },
    pressed: { opacity: 0.8 },
  }),
});
