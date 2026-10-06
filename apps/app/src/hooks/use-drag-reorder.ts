import { sortOrderForMove, voice } from '@pn/core';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, type LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';

type Layout = { y: number; height: number };
type Item = { id: string; sortOrder: number };

/**
 * Drag a handle to reorder a list (a task's steps, territories). Rows make
 * room as the dragged one passes their middles; only the moved row gets a new
 * `sortOrder`. VoiceOver gets Move up / Move down on each row.
 * `spacing`: the gap between rows, when they aren't flush.
 */
export function useDragReorder<T extends Item>(items: T[], onMove: (item: T, sortOrder: number) => void, spacing = 0) {
  const [layouts, setLayouts] = useState<Record<string, Layout>>({});
  const [drag, setDrag] = useState<{ id: string; dy: number } | null>(null);

  /** Where the dragged row would land: how many other rows' middles it has passed. */
  const landing = (id: string, dy: number) => {
    const own = layouts[id];
    if (!own) return items.findIndex((it) => it.id === id);
    const middle = own.y + own.height / 2 + dy;
    return items.filter((it) => it.id !== id && layouts[it.id] && layouts[it.id].y + layouts[it.id].height / 2 < middle).length;
  };
  const move = (from: number, to: number) => {
    if (to !== from && to >= 0 && to < items.length) onMove(items[from], sortOrderForMove(items.map((it) => it.sortOrder), from, to));
  };

  const from = drag ? items.findIndex((it) => it.id === drag.id) : -1;
  const to = drag ? landing(drag.id, drag.dy) : -1;
  const gap = drag ? (layouts[drag.id]?.height ?? 0) + spacing : 0;

  /** How far row `i` sits from its place while a row is dragged. */
  const shift = (i: number) => {
    if (!drag) return 0;
    if (i === from) return drag.dy;
    if (from < to && i > from && i <= to) return -gap;
    if (to < from && i >= to && i < from) return gap;
    return 0;
  };

  /** The pan gesture for row `index`'s handle. */
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

  const onLayout = (id: string) => (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setLayouts((prev) => (prev[id]?.y === y && prev[id]?.height === height ? prev : { ...prev, [id]: { y, height } }));
  };

  /** VoiceOver's Move up / Move down for row `i`. */
  const actions = (i: number) => ({
    accessibilityActions: [
      ...(i > 0 ? [{ name: 'moveUp', label: voice.task.moveUp }] : []),
      ...(i < items.length - 1 ? [{ name: 'moveDown', label: voice.task.moveDown }] : []),
    ],
    onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) =>
      move(i, e.nativeEvent.actionName === 'moveUp' ? i - 1 : i + 1),
  });

  return { draggingId: drag?.id ?? null, shift, grab, onLayout, actions };
}
