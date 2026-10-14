import { voice } from '@pn/core';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { useTasks } from '@/data/tasks-store';
import { useTokens } from '@/theme/tokens';

/** The tasks store's short-lived note ("Deleted …", "Walk Biscuit · back tomorrow"), with Undo when there is one. */
export function NoticeBar() {
  const t = useTokens();
  const { notice } = useTasks();
  if (!notice) return null;
  return (
    <View style={styles.bar} accessibilityLiveRegion="polite">
      <Text variant="meta" color={t.c.primaryText} style={styles.text}>
        {notice.text}
      </Text>
      {notice.undo ? <Button variant="quiet" label={voice.task.undo} onPress={notice.undo} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  text: { flex: 1 },
});
