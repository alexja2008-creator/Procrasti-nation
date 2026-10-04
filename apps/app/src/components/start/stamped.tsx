import { formatStampDate, motion, voice } from '@pn/core';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/button';
import { RoundStamp } from '@/components/stamp';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.start;

type Props = {
  /** The next open step of the same plan, if there is one. */
  nextTitle?: string;
  onStartNext?: () => void;
  onBack: () => void;
};

/** Done → the ink stamp comes down with a haptic thunk, then the way forward. */
export function Stamped({ nextTitle, onStartNext, onBack }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 1.9);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!reduceMotion) {
      // Accelerate into the page, squash a little on impact, settle.
      scale.set(
        withSequence(
          withTiming(0.94, { duration: motion.stamp, easing: Easing.in(Easing.cubic) }),
          withTiming(1, { duration: motion.quick, easing: Easing.out(Easing.quad) }),
        ),
      );
      opacity.set(withTiming(1, { duration: motion.stamp / 2 }));
    }
    if (Platform.OS === 'web') return;
    const thunk = setTimeout(
      () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      reduceMotion ? 0 : motion.stamp,
    );
    return () => clearTimeout(thunk);
  }, [reduceMotion, scale, opacity]);

  const land = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ rotate: '-8deg' }, { scale: scale.get() }] }));

  return (
    <View style={s.panel}>
      <Animated.View style={[s.stamp, land]}>
        <RoundStamp
          ink={c.stamp.terracotta}
          rim={voice.stampText.rim}
          lines={voice.stampText.done}
          date={formatStampDate(new Date())}
          size={196}
        />
      </Animated.View>
      <View style={s.words} accessibilityLiveRegion="polite">
        <Text variant="pageTitle" accessibilityRole="header" style={s.centered}>
          {copy.stampedTitle}
        </Text>
        <Text variant="lead" color={c.inkSoft} style={s.centered}>
          {copy.stampedBody}
        </Text>
      </View>
      {nextTitle && onStartNext ? (
        <>
          <View style={s.next}>
            <Text variant="label" color={c.primaryText}>
              {copy.nextStep.toUpperCase()}
            </Text>
            <Text variant="step">{nextTitle}</Text>
          </View>
          <Button label={copy.startNext} onPress={onStartNext} />
          <Button variant="quiet" label={copy.backToToday} onPress={onBack} />
        </>
      ) : (
        <Button label={copy.backToToday} onPress={onBack} />
      )}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    panel: { width: '100%', gap: 14, paddingTop: 12 },
    stamp: { alignSelf: 'center', marginBottom: 8 },
    words: { gap: 6 },
    centered: { textAlign: 'center' },
    next: {
      gap: 6,
      padding: 16,
      marginTop: 6,
      borderWidth: 1,
      borderColor: t.c.next.border,
      borderRadius: t.radii.card,
      backgroundColor: t.c.next.bg,
    },
  }),
});
