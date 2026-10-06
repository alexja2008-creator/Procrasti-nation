import { voice, type Task } from '@pn/core';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useDragReorder } from '@/hooks/use-drag-reorder';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.task;

type Props = {
  /** Open (non-deleted) steps, in order. */
  steps: Task[];
  onToggle: (step: Task) => void;
  onOpen: (step: Task) => void;
  /** A step moved: its new sortOrder. */
  onMove: (step: Task, sortOrder: number) => void;
  onAdd: (title: string) => void;
};

/** A task's steps: check off, open, drag the handle to reorder, add more at the end. */
export function StepsList({ steps, onToggle, onOpen, onMove, onAdd }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { draggingId, shift, grab, onLayout, actions } = useDragReorder(steps, onMove);
  const [draft, setDraft] = useState('');
  const done = steps.filter((st) => st.completedAt).length;

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title);
    setDraft('');
  };

  return (
    <View style={s.section}>
      <View style={s.head}>
        <Text variant="label" color={c.muted}>
          {copy.steps.toUpperCase()}
        </Text>
        {steps.length ? (
          <Text variant="labelSmall" color={c.muted}>
            {copy.stepsDone(done, steps.length).toUpperCase()}
          </Text>
        ) : null}
      </View>

      <View style={s.card}>
        {steps.map((step, i) => {
          const isDone = !!step.completedAt;
          const dragging = draggingId === step.id;
          return (
            <View
              key={step.id}
              onLayout={onLayout(step.id)}
              style={[s.row, { transform: [{ translateY: shift(i) }] }, dragging && s.dragging]}>
              <Pressable
                onPress={() => onToggle(step)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                accessibilityLabel={(isDone ? copy.markNotDone : copy.markDone)(step.title)}
                style={s.check}>
                {isDone ? (
                  <View style={s.checked}>
                    <Icon name="check" size={12} color={c.onPrimary} strokeWidth={3} />
                  </View>
                ) : (
                  <View style={s.unchecked} />
                )}
              </Pressable>
              <Pressable
                onPress={() => onOpen(step)}
                accessibilityRole="button"
                {...actions(i)}
                style={s.main}>
                <Text variant="item" color={isDone ? c.muted : c.ink} style={isDone && s.struck}>
                  {step.title}
                </Text>
              </Pressable>
              {step.estimateMinutes ? (
                <Text variant="label" color={c.muted} style={s.minutes}>
                  {step.estimateMinutes} min
                </Text>
              ) : null}
              <GestureDetector gesture={grab(step.id, i)}>
                <View style={s.handle} accessibilityLabel={copy.reorder(step.title)} aria-hidden>
                  <Icon name="grip" size={18} color={c.muted} strokeWidth={1.8} />
                </View>
              </GestureDetector>
            </View>
          );
        })}

        <View style={[s.row, s.addRow]}>
          <View style={s.check}>
            <Icon name="plus" size={18} color={c.primaryText} strokeWidth={2} />
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder={copy.addStep}
            placeholderTextColor={c.muted}
            accessibilityLabel={copy.addStep}
            style={[s.t.text.item, s.addInput]}
          />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    section: { gap: 8 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    card: {
      backgroundColor: t.c.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      borderRadius: t.radii.card,
      paddingHorizontal: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 52,
      backgroundColor: t.c.card,
      borderBottomWidth: 1,
      borderBottomColor: t.c.rule,
    },
    dragging: { zIndex: 1, opacity: 0.92, borderBottomColor: 'transparent' },
    check: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    unchecked: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: t.c.checkbox },
    checked: { width: 20, height: 20, borderRadius: 10, backgroundColor: t.c.primary, alignItems: 'center', justifyContent: 'center' },
    main: { flex: 1, paddingVertical: 12 },
    struck: { textDecorationLine: 'line-through' },
    minutes: { letterSpacing: 0 },
    handle: {
      width: t.hitTarget,
      height: t.hitTarget,
      alignItems: 'center',
      justifyContent: 'center',
      // RN's types only know auto/pointer; the browser understands grab.
      ...(Platform.OS === 'web' ? ({ cursor: 'grab' } as unknown as ViewStyle) : null),
    },
    addRow: { borderBottomWidth: 0 },
    addInput: { flex: 1, color: t.c.ink, paddingVertical: 12 },
  }),
});
