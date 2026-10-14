import { voice } from '@pn/core';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { LandingStamp } from '@/components/landing-stamp';
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

  return (
    <View style={s.panel}>
      <LandingStamp ink={c.stamp.terracotta} lines={voice.stampText.done} style={s.stamp} />
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
