import { sortOrderForMove, voice, type Task } from '@pn/core';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
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

type Layout = { y: number; height: number };

/** A task's steps: check off, open, drag the handle to reorder, add more at the end. */
export function StepsList({ steps, onToggle, onOpen, onMove, onAdd }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [layouts, setLayouts] = useState<Record<string, Layout>>({});
  const [drag, setDrag] = useState<{ id: string; dy: number } | null>(null);
  const [draft, setDraft] = useState('');

  const orders = steps.map((st) => st.sortOrder);
  const done = steps.filter((st) => st.completedAt).length;

  /** Where the dragged row would land: how many other rows' middles it has passed. */
  const landing = (id: string, dy: number) => {
    const own = layouts[id];
    if (!own) return steps.findIndex((st) => st.id === id);
    const middle = own.y + own.height / 2 + dy;
    return steps.filter((st) => st.id !== id && layouts[st.id] && layouts[st.id].y + layouts[st.id].height / 2 < middle).length;
  };
  const move = (from: number, to: number) => {
    if (to !== from && to >= 0 && to < steps.length) onMove(steps[from], sortOrderForMove(orders, from, to));
  };

  const from = drag ? steps.findIndex((st) => st.id === drag.id) : -1;
  const to = drag ? landing(drag.id, drag.dy) : -1;
  const gap = drag ? (layouts[drag.id]?.height ?? 0) : 0;
  const shift = (i: number) => {
    if (!drag || i === from) return drag && i === from ? drag.dy : 0;
    if (from < to && i > from && i <= to) return -gap;
    if (to < from && i >= to && i < from) return gap;
    return 0;
  };

  const grab = (id: string, index: number) =>
    Gesture.Pan()
      .runOnJS(true)
      .minDistance(2)
      .onStart(() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        setDrag({ id, dy: 0 });
      })
      .onUpdate((e) => setDrag({ id, dy: e.translationY }))
      .onEnd((e) => move(index, landing(id, e.translationY)))
      .onFinalize(() => setDrag(null));

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
          const dragging = drag?.id === step.id;
          return (
            <View
              key={step.id}
              onLayout={(e) => {
                const { y, height } = e.nativeEvent.layout;
                setLayouts((prev) => (prev[step.id]?.y === y && prev[step.id]?.height === height ? prev : { ...prev, [step.id]: { y, height } }));
              }}
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
                accessibilityActions={[
                  ...(i > 0 ? [{ name: 'moveUp', label: copy.moveUp }] : []),
                  ...(i < steps.length - 1 ? [{ name: 'moveDown', label: copy.moveDown }] : []),
                ]}
                onAccessibilityAction={(e) => move(i, e.nativeEvent.actionName === 'moveUp' ? i - 1 : i + 1)}
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
