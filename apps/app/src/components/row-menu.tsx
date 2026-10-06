import { actions, voice, type Task } from '@pn/core';
import { Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
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
  if (!task) return null;

  const item = (icon: IconName, label: string, run: (t: Task) => void) => (
    <Pressable
      onPress={() => {
        onClose();
        run(task);
      }}
      accessibilityRole="button"
      style={({ pressed }) => [s.item, pressed && s.pressed]}>
      <Icon name={icon} size={20} color={c.primaryText} strokeWidth={1.9} />
      <Text variant="item">{label}</Text>
    </Pressable>
  );

  return (
    <Sheet
      onClose={onClose}
      width={360}
      header={
        <Text variant="body" color={c.inkSoft} numberOfLines={2} style={s.title}>
          {task.title}
        </Text>
      }>
      {item('play', actions.start, onStart)}
      {canPlan ? item('shrink', actions.planIt, onPlan) : null}
      <Button variant="quiet" label={voice.cancel} onPress={onClose} />
    </Sheet>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
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
