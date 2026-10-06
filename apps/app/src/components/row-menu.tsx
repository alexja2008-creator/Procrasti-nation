import { actions, clockOf, voice, whenPatch, type Task } from '@pn/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { DateSheet } from '@/components/task/date-sheet';
import { Text } from '@/components/text';
import { useTasks } from '@/data/tasks-store';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = { task: Task | null; onClose: () => void };

/**
 * A task's actions, opened by pressing and holding a row (or right-clicking it
 * on web): Start, Plan it (top-level tasks without a plan), and Move to…,
 * which reschedules it with the When sheet.
 */
export function RowMenu({ task, onClose }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, today, update } = useTasks();
  const [moving, setMoving] = useState<Task | null>(null);

  const canPlan =
    !!task && !task.parentId && task.source !== 'ai' && !task.completedAt && !tasks.some((t) => t.parentId === task.id);

  const item = (icon: IconName, label: string, run: (t: Task) => void) => (
    <Pressable
      onPress={() => {
        if (!task) return;
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
    <>
      {task ? (
        <Sheet
          onClose={onClose}
          width={360}
          header={
            <Text variant="body" color={c.inkSoft} numberOfLines={2} style={s.title}>
              {task.title}
            </Text>
          }>
          {item('play', actions.start, (t) => router.push({ pathname: '/start/[id]', params: { id: t.id } }))}
          {canPlan ? item('shrink', actions.planIt, (t) => router.push({ pathname: '/plan/[id]', params: { id: t.id } })) : null}
          {item('calendar', voice.task.moveTo, setMoving)}
          <Button variant="quiet" label={voice.cancel} onPress={onClose} />
        </Sheet>
      ) : null}
      {moving ? (
        <DateSheet
          title={voice.task.when}
          day={moving.scheduledOn}
          time={moving.remindAt ? clockOf(moving.remindAt) : null}
          today={today}
          onSave={(day, time) => {
            // Save onto the latest copy, in case it changed while the sheet was open.
            update(tasks.find((t) => t.id === moving.id) ?? moving, whenPatch(day, time));
            setMoving(null);
          }}
          onClose={() => setMoving(null)}
        />
      ) : null}
    </>
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
