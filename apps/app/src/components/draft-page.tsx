import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useTokens } from '@/theme/tokens';

/** Placeholder for a tab that is designed but not built yet. */
export function DraftPage({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
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
    </Screen>
  );
}

const styles = StyleSheet.create({ head: { gap: 6 } });
