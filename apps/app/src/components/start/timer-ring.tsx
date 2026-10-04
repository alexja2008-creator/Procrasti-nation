import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const SIZE = 224;
const RADIUS = 100;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  /** 0–1 of the ring filled. */
  progress: number;
  /** Big numerals: "3:12". */
  clock: string;
  /** Mono line under it: "of 5:00", "and counting", "paused". */
  caption: string;
  /** What a screen reader hears instead of the numerals. */
  accessibilityLabel: string;
};

/** Start Mode's timer: a forest ring filling clockwise around the countdown. */
export function TimerRing({ progress, clock, caption, accessibilityLabel }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const offset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <View style={s.ring} accessible accessibilityRole="timer" accessibilityLabel={accessibilityLabel}>
      {/* Rotated so the ring starts at 12 o'clock. */}
      <View style={s.rotated}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={c.chip} strokeWidth={8} />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={c.primary}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={offset}
          />
        </Svg>
      </View>
      <View style={s.center} aria-hidden>
        <Text variant="title" style={s.clock}>
          {clock}
        </Text>
        <Text variant="label" color={c.muted} style={s.caption}>
          {caption.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    ring: { width: SIZE, height: SIZE, alignSelf: 'center' },
    rotated: { transform: [{ rotate: '-90deg' }] },
    center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 4 },
    clock: { fontSize: 58, lineHeight: 62, fontVariant: ['tabular-nums'] },
    caption: { letterSpacing: 1.5 },
  }),
});
