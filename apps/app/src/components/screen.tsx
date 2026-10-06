import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecurityLines } from '@/components/security-lines';
import { useIsWide } from '@/hooks/use-is-wide';
import { useTokens } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  scrollRef?: Ref<ScrollView>;
  /**
   * Children (by index) that pin to the top while the rest scrolls. Passing it
   * (even empty) makes the page scroll below the status bar, so a pinned child
   * never sits under it and toggling pins doesn't shift the page.
   */
  stickyHeaderIndices?: number[];
  /** Laptop width only: a column beside the scrolling one that stays put (Upcoming's calendar). */
  aside?: ReactNode;
};

/** Passport-paper page with a centered, scrolling content column. */
export function Screen({ children, scrollRef, stickyHeaderIndices, aside }: Props) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const wide = useIsWide();
  const belowStatusBar = stickyHeaderIndices !== undefined;
  const top = wide ? 48 : t.space.xxl;

  const scroll = (
    <ScrollView
      ref={scrollRef}
      style={belowStatusBar ? { marginTop: insets.top } : undefined}
      stickyHeaderIndices={stickyHeaderIndices}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.column, { paddingTop: belowStatusBar ? top : insets.top + top, gap: 14 }]}>
      {children}
    </ScrollView>
  );

  return (
    <View style={[styles.fill, { backgroundColor: t.c.bg }]}>
      <SecurityLines color={t.c.securityLine} />
      {wide && aside ? (
        <View style={styles.split}>
          <View style={[styles.aside, { paddingTop: insets.top + top }]}>{aside}</View>
          <View style={styles.fill}>{scroll}</View>
        </View>
      ) : (
        scroll
      )}
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
  split: { flex: 1, flexDirection: 'row', width: '100%', maxWidth: 1040, alignSelf: 'center' },
  aside: { width: 340, paddingLeft: 20 },
});
