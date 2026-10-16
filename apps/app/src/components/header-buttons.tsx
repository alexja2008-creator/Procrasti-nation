import { guide, voice } from '@pn/core';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { useStyles, type Tokens } from '@/theme/tokens';

export const openSearch = () => router.push('/search');
export const openGuide = () => router.push('/guide');

/** The "?" and the magnifier at the end of a tab's eyebrow row: the guide, and search. */
export function HeaderButtons() {
  const s = useStyles(makeStyles);
  return (
    <View style={s.row}>
      <HeaderButton icon="help" label={guide.open} onPress={openGuide} />
      <HeaderButton icon="search" label={voice.search.title} onPress={openSearch} />
    </View>
  );
}

function HeaderButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.button, pressed && s.pressed]}>
      <Icon name={icon} size={20} color={s.t.c.ink} strokeWidth={1.9} />
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    // Negative margins: full-size targets without making the eyebrow row taller, and the
    // magnifier's edge lined up with the page's.
    row: { flexDirection: 'row', marginLeft: 'auto', marginVertical: -14, marginRight: -12 },
    button: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.6 },
  }),
});
