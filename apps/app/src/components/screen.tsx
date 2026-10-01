import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecurityLines } from '@/components/security-lines';
import { useIsWide } from '@/hooks/use-is-wide';
import { useTokens } from '@/theme/tokens';

/** Passport-paper page with a centered, scrolling content column. */
export function Screen({ children }: { children: ReactNode }) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const wide = useIsWide();

  return (
    <View style={[styles.fill, { backgroundColor: t.c.bg }]}>
      <SecurityLines color={t.c.securityLine} />
      <ScrollView
        contentContainerStyle={[
          styles.column,
          { paddingTop: insets.top + (wide ? 48 : t.space.xxl), gap: 14 },
        ]}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});
