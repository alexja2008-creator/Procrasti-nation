import { voice } from '@pn/core';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { TerritoryView } from '@/components/territory/territory-view';
import { useStyles, type Tokens } from '@/theme/tokens';

const back = () => (router.canGoBack() ? router.back() : router.replace('/territories'));

/** A territory (or Customs, as `customs`) as its own page, opened from the Territories tab on phones. */
export default function TerritoryRoute() {
  const s = useStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen>
      <Pressable onPress={back} accessibilityRole="button" style={({ pressed }) => [s.back, pressed && s.pressed]}>
        <Icon name="chevronLeft" size={18} color={s.t.c.primaryText} strokeWidth={2} />
        <Text variant="button" color={s.t.c.primaryText}>
          {voice.territories.back}
        </Text>
      </Pressable>
      <TerritoryView key={id} id={id} onDeleted={back} />
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: t.hitTarget, marginLeft: -6, marginTop: -16 },
    pressed: { opacity: 0.7 },
  }),
});
