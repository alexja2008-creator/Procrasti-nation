import { voice } from '@pn/core';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.notes;
// The shortcut as this keyboard writes it.
const keys = Platform.OS === 'web' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘⇧L' : 'Ctrl+Shift+L';

/** The tip under a new note's title: how a line becomes a task. */
export function ChecklistHint({ onHide }: { onHide: () => void }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <View style={s.hint}>
      <Icon name="checkbox" size={16} color={c.primaryText} strokeWidth={1.9} />
      <Text variant="meta" color={c.inkSoft} style={s.text}>
        {Platform.OS === 'web' ? copy.checklistHintWeb(keys) : copy.checklistHint}
      </Text>
      <Pressable onPress={onHide} accessibilityRole="button" accessibilityLabel={copy.hideHint} hitSlop={8} style={s.hide}>
        <Icon name="close" size={14} color={c.muted} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    hint: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingVertical: 10,
      paddingLeft: 12,
      paddingRight: 6,
      borderRadius: t.radii.md,
      backgroundColor: t.c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.c.rule,
    },
    text: { flex: 1 },
    hide: { padding: 2 },
  }),
});
