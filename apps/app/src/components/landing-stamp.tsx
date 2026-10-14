import { formatStampDate, motion, voice } from '@pn/core';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RoundStamp } from '@/components/stamp';

type Props = {
  ink: string;
  lines: readonly [string, string];
  size?: number;
  style?: object;
};

/** A round ink stamp that comes down onto the page with a haptic thunk (Done in Start Mode, Approved). */
export function LandingStamp({ ink, lines, size = 196, style }: Props) {
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
    <Animated.View style={[style, land]}>
      <RoundStamp ink={ink} rim={voice.stampText.rim} lines={lines} date={formatStampDate(new Date())} size={size} />
    </Animated.View>
  );
}
