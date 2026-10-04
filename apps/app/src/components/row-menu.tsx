import { actions, voice, type Task } from '@pn/core';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { useIsWide } from '@/hooks/use-is-wide';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = {
  task: Task | null;
  /** Only top-level tasks without a plan can be planned. */
  canPlan: boolean;
  onStart: (task: Task) => void;
  onPlan: (task: Task) => void;
  onClose: () => void;
};

/** A task's actions, opened by pressing and holding a row (or right-clicking it on web). */
export function RowMenu({ task, canPlan, onStart, onPlan, onClose }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const wide = useIsWide();
  const insets = useSafeAreaInsets();

  const item = (icon: IconName, label: string, run: (t: Task) => void) => (
    <Pressable
      onPress={() => {
        onClose();
        if (task) run(task);
      }}
      accessibilityRole="button"
      style={({ pressed }) => [s.item, pressed && s.pressed]}>
      <Icon name={icon} size={20} color={c.primaryText} strokeWidth={1.9} />
      <Text variant="item">{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={!!task} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[s.backdrop, wide && s.backdropWide]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={voice.cancel} />
        <View style={[s.sheet, wide ? s.card : { paddingBottom: Math.max(insets.bottom, 12) }]} accessibilityViewIsModal>
          <Text variant="body" color={c.inkSoft} numberOfLines={2} style={s.title}>
            {task?.title}
          </Text>
          {item('play', actions.start, onStart)}
          {canPlan ? item('shrink', actions.planIt, onPlan) : null}
          <Button variant="quiet" label={voice.cancel} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: t.c.scrim },
    backdropWide: { justifyContent: 'center', alignItems: 'center' },
    sheet: {
      gap: 4,
      paddingTop: 14,
      paddingHorizontal: 16,
      backgroundColor: t.c.card,
      borderTopLeftRadius: t.radii.card,
      borderTopRightRadius: t.radii.card,
    },
    card: { width: 360, borderRadius: t.radii.card, paddingBottom: 8 },
    title: { paddingHorizontal: 4, paddingBottom: 6 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 52,
      paddingHorizontal: 4,
      borderTopWidth: 1,
      borderTopColor: t.c.rule,
    },
    pressed: { opacity: 0.7 },
  }),
});
