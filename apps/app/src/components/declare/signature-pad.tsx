import { voice } from '@pn/core';
import type { Dispatch, SetStateAction } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.declaration;

type Point = [number, number];

/** What's on the line: strokes drawn, or their name signed with a tap. Never stored. */
export type Signature = { strokes: Point[][]; name: string | null };

export const NO_SIGNATURE: Signature = { strokes: [], name: null };

// Enough ink to be a signature, not a stray tap (total stroke length, in points).
const MIN_INK = 60;

const ink = (strokes: Point[][]) =>
  strokes.reduce((sum, s) => sum + s.slice(1).reduce((len, [x, y], i) => len + Math.hypot(x - s[i][0], y - s[i][1]), 0), 0);

export const isSigned = (sig: Signature) => !!sig.name || ink(sig.strokes) >= MIN_INK;

const pathOf = (stroke: Point[]) => stroke.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

type Props = {
  value: Signature;
  onChange: Dispatch<SetStateAction<Signature>>;
  /** What "Sign with my name" writes on the line. */
  name: string;
  /** A stroke began (true) or ended: a scrolling page holds still meanwhile. */
  onDrawing?: (drawing: boolean) => void;
};

/**
 * The signature line: draw with a finger (a mouse on web), or "Sign with my name", which also
 * serves VoiceOver and keyboard users. The ceremony is the point; nothing is saved.
 */
export function SignaturePad({ value, onChange, name, onDrawing }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const empty = !value.name && value.strokes.length === 0;

  // React Native's own touch system: works inside a Modal and on web (a mouse), and keeps the
  // touch for the whole stroke. Children don't take touches, so locations are the pad's own.
  const at = (e: GestureResponderEvent): Point => [e.nativeEvent.locationX, e.nativeEvent.locationY];
  const begin = (e: GestureResponderEvent) => {
    onDrawing?.(true);
    const point = at(e);
    onChange((prev) => ({ name: null, strokes: [...prev.strokes, [point]] }));
  };
  const extend = (e: GestureResponderEvent) => {
    const point = at(e);
    onChange((prev) => {
      const strokes = prev.strokes.slice();
      strokes[strokes.length - 1] = [...(strokes.at(-1) ?? []), point];
      return { ...prev, strokes };
    });
  };

  return (
    <View style={s.wrap}>
      <View
        style={s.area}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={begin}
        onResponderMove={extend}
        onResponderRelease={() => onDrawing?.(false)}
        onResponderTerminate={() => onDrawing?.(false)}
        accessibilityLabel={copy.signLabel}
        accessibilityHint={copy.signHint}>
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {value.strokes.map((stroke, i) => (
            <Path key={i} d={pathOf(stroke)} stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </Svg>
        {value.name ? (
          <Text style={s.name} numberOfLines={1} adjustsFontSizeToFit pointerEvents="none">
            {value.name}
          </Text>
        ) : null}
        <View style={s.baseline} pointerEvents="none">
          <Text variant="label" color={c.muted}>
            ×
          </Text>
          <View style={s.rule} />
        </View>
        {empty ? (
          <Text variant="labelSmall" color={c.muted} style={s.hint} pointerEvents="none">
            {copy.signHere.toUpperCase()}
          </Text>
        ) : null}
      </View>
      <View style={s.buttons}>
        <Button variant="quiet" label={copy.signWithName} onPress={() => onChange({ strokes: [], name })} />
        {!empty ? <Button variant="quiet" label={copy.clear} onPress={() => onChange(NO_SIGNATURE)} /> : null}
      </View>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    wrap: { gap: 2 },
    area: {
      height: 112,
      borderRadius: t.radii.lg,
      borderWidth: 1,
      borderColor: t.c.pageBorder,
      backgroundColor: t.c.page,
      overflow: 'hidden',
    },
    // Its own line height: the body style's 20 would clip a 34-point name.
    name: { position: 'absolute', left: 36, right: 16, bottom: 30, fontFamily: t.fonts.displayItalic, fontSize: 34, lineHeight: 44, color: t.c.ink },
    baseline: { position: 'absolute', left: 14, right: 14, bottom: 26, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    rule: { flex: 1, height: 1, backgroundColor: t.c.dashed, marginBottom: 4 },
    hint: { position: 'absolute', left: 14, bottom: 8 },
    buttons: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: -8, marginRight: -8 },
  }),
});
