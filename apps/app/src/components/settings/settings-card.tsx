import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

/** A titled card of settings (the Reminders card's look). */
export function SettingsCard({ label, children }: { label: string; children: ReactNode }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.card}>
      <Text variant="label" color={s.t.c.muted} style={s.label}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    card: {
      gap: 4,
      paddingTop: 14,
      paddingBottom: 6,
      paddingHorizontal: 18,
      backgroundColor: t.c.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      borderRadius: t.radii.card,
    },
    label: { letterSpacing: 1.5 },
  }),
});
