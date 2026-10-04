import { voice } from '@pn/core';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.start;
/** Box breathing: in, hold, out, hold, four seconds each. */
const PHASE_MS = 4000;
const PHASES = ['in', 'hold', 'out', 'hold'] as const;
const SMALL = 0.55;

/** "Take a breather": a minute of box breathing while the clock waits. */
export function Breather({ onDone }: { onDone: () => void }) {
  const s = useStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(SMALL);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!reduceMotion) {
      const ease = Easing.inOut(Easing.quad);
      scale.set(
        withRepeat(
          withSequence(
            withTiming(1, { duration: PHASE_MS, easing: ease }),
            withTiming(1, { duration: PHASE_MS }),
            withTiming(SMALL, { duration: PHASE_MS, easing: ease }),
            withTiming(SMALL, { duration: PHASE_MS }),
          ),
          -1,
        ),
      );
    }
    const timer = setInterval(() => setStep((n) => n + 1), PHASE_MS);
    return () => {
      clearInterval(timer);
      cancelAnimation(scale);
    };
  }, [reduceMotion, scale]);

  const grow = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <View style={s.panel}>
      <Text variant="section" accessibilityRole="header" style={s.centered}>
        {copy.breatherTitle}
      </Text>
      <View style={s.stage}>
        <Animated.View style={[s.circle, grow]} />
        <Text variant="step" style={s.label} accessibilityLiveRegion="polite">
          {copy.breathe[PHASES[step % PHASES.length]]}
        </Text>
      </View>
      <Button label={copy.backToIt} onPress={onDone} />
    </View>
  );
}

const makeStyles = (t: Tokens) =>
  StyleSheet.create({
    panel: { width: '100%', gap: 16 },
    centered: { textAlign: 'center' },
    stage: { height: 230, alignItems: 'center', justifyContent: 'center' },
    circle: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: t.c.next.bg,
      borderWidth: 1,
      borderColor: t.c.next.border,
    },
    label: { fontFamily: t.fonts.displayItalic, fontSize: 22, lineHeight: 28 },
  });
