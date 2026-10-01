import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useTokens } from '@/theme/tokens';

type Props = { eyebrow: string; title: string; lead: string; children?: ReactNode };

/** Placeholder for a tab that is designed but not built yet. */
export function DraftPage({ eyebrow, title, lead, children }: Props) {
  const t = useTokens();
  return (
    <Screen>
      <View style={styles.head}>
        <Text variant="label" color={t.c.muted}>
          {eyebrow}
        </Text>
        <Text variant="pageTitle" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="lead" color={t.c.muted}>
          {lead}
        </Text>
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({ head: { gap: 6 } });
