import { fonts } from '@pn/core';
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';

import { Text } from '@/components/text';

type RoundProps = {
  ink: string;
  /** Curved along the top rim, e.g. "PROCRASTINATION". */
  rim: string;
  /** Two short words across the middle. */
  lines: readonly [string, string];
  /** Curved along the bottom rim, e.g. "04 OCT · 2026". */
  date: string;
  size?: number;
};

// The middle words, in the stamp's 120-unit box: the top line has the inner
// ring's width; the bottom one sits between the ends of the date on the rim.
const WORD_SIZE = 12.5;
const LETTER = 0.6;
const TOP_WIDTH = 84;
const BOTTOM_WIDTH = 56;
/** IBM Plex Mono: every glyph is 0.6 em wide. */
const fit = (word: string, width: number) => Math.min(WORD_SIZE, (width / word.length - LETTER) / 0.6);

// The rim text sits as far inside the ring (r = 50) at the bottom as at the top. The top
// line stands on a radius-40 arc with its caps (0.698 em in Plex Mono) reaching out to
// ~45.9; the bottom line's letters stand upright, so it's their baseline that faces the ring.
const RIM_SIZE = 8.5;
const RIM_TOP_RADIUS = 40;
const RIM_BOTTOM_RADIUS = RIM_TOP_RADIUS + 0.698 * RIM_SIZE;
const arc = (r: number, sweep: 0 | 1) => `M ${60 - r} 60 A ${r} ${r} 0 0 ${sweep} ${60 + r} 60`;

/** The round ink stamp from the A2 Passport: rim text on both arcs, two words in the middle. */
export function RoundStamp({ ink, rim, lines, date, size = 116 }: RoundProps) {
  // TextPath needs document-unique ids; useId's colons aren't safe in every renderer.
  const id = `stamp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [top, bottom] = [fit(lines[0], TOP_WIDTH), fit(lines[1], BOTTOM_WIDTH)];
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <Defs>
        <Path id={`${id}top`} d={arc(RIM_TOP_RADIUS, 1)} />
        <Path id={`${id}bottom`} d={arc(RIM_BOTTOM_RADIUS, 0)} />
      </Defs>
      <Circle cx={60} cy={60} r={57} fill="none" stroke={ink} strokeWidth={1.8} strokeDasharray="3.5 2.5" />
      <Circle cx={60} cy={60} r={50} fill="none" stroke={ink} strokeWidth={1.4} />
      <SvgText fill={ink} fontFamily={fonts.mono} fontSize={RIM_SIZE} letterSpacing={1.6} textAnchor="middle">
        <TextPath href={`#${id}top`} startOffset="50%">
          {rim}
        </TextPath>
      </SvgText>
      <SvgText x={60} y={59} fill={ink} textAnchor="middle" fontFamily={fonts.monoMedium} fontSize={top} letterSpacing={LETTER}>
        {lines[0]}
      </SvgText>
      <SvgText x={60} y={74} fill={ink} textAnchor="middle" fontFamily={fonts.monoMedium} fontSize={bottom} letterSpacing={LETTER}>
        {lines[1]}
      </SvgText>
      <SvgText fill={ink} fontFamily={fonts.mono} fontSize={8} letterSpacing={1.4} textAnchor="middle">
        <TextPath href={`#${id}bottom`} startOffset="50%">
          {date}
        </TextPath>
      </SvgText>
    </Svg>
  );
}

type CountProps = { ink: string; top: string; value: number; bottom: string };

/** The rectangular count stamp ("SMALL STEPS · 17 · AND COUNTING"), double-ruled. */
export function CountStamp({ ink, top, value, bottom }: CountProps) {
  return (
    <View style={[styles.outer, { borderColor: ink }]} aria-hidden>
      <View style={[styles.inner, { borderColor: ink }]}>
        <Text variant="labelSmall" color={ink} style={styles.caption}>
          {top}
        </Text>
        <Text variant="title" color={ink} style={styles.value}>
          {value}
        </Text>
        <Text variant="labelSmall" color={ink} style={styles.caption}>
          {bottom}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // No fill: like ink, a stamp laid over another lets it show through.
  outer: { borderWidth: 1, padding: 3 },
  inner: {
    width: 102,
    minHeight: 92,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  caption: { letterSpacing: 1.1 },
  value: { fontSize: 30, lineHeight: 34 },
});
