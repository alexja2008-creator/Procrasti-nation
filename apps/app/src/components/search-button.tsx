import { voice } from '@pn/core';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { useStyles, type Tokens } from '@/theme/tokens';

export const openSearch = () => router.push('/search');

/** The magnifier at the end of a tab's eyebrow row: opens search. */
export function SearchButton() {
  const s = useStyles(makeStyles);
  return (
    <Pressable
      onPress={openSearch}
      accessibilityRole="button"
      accessibilityLabel={voice.search.title}
      hitSlop={8}
      style={({ pressed }) => [s.button, pressed && s.pressed]}>
      <Icon name="search" size={20} color={s.t.c.ink} strokeWidth={1.9} />
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    // Negative margins: a full-size target without making the eyebrow row taller.
    button: { marginLeft: 'auto', width: 36, height: 36, marginVertical: -10, marginRight: -8, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.6 },
  }),
});
