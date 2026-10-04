import { actions, describeRRule, voice } from '@pn/core';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

/** What a row shows; screens map tasks onto this. */
export interface TaskRowItem {
  id: string;
  title: string;
  /** Second line, e.g. "Chem 201 · step 3 of 6" or "due Fri". */
  meta?: string;
  rrule?: string;
  minutes?: number;
  /** Clock label on the right, e.g. "2:00 PM". */
  time?: string;
  /** Big or vague task with no plan yet: offer "Plan it". */
  suggestPlan?: boolean;
  done?: boolean;
}

type Props = {
  item: TaskRowItem;
  last?: boolean;
  onToggle: (id: string) => void;
  onPlan?: (id: string) => void;
  /** Opens the row's menu (Start, Plan it): press and hold, or right-click on web. */
  onMenu?: (id: string) => void;
};

export function TaskRow({ item, last, onToggle, onPlan, onMenu }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const done = !!item.done;

  const toggle = () => {
    if (!done && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onToggle(item.id);
  };

  const menu = onMenu && !done ? () => onMenu(item.id) : undefined;
  const holdForMenu = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    menu?.();
  };
  // react-native-web passes onContextMenu through; RN's types don't know it.
  const rightClick =
    Platform.OS === 'web' && menu
      ? ({ onContextMenu: (e: { preventDefault: () => void }) => (e.preventDefault(), menu()) } as object)
      : {};

  return (
    <View style={[s.row, item.suggestPlan && s.rowTop, !last && s.rule]}>
      <Pressable
        onPress={toggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${done ? 'Mark not done' : 'Complete'}: ${item.title}`}
        style={s.check}>
        {done ? (
          <View style={s.checked}>
            <Icon name="check" size={13} color={c.onPrimary} strokeWidth={3} />
          </View>
        ) : (
          <View style={s.unchecked} />
        )}
      </Pressable>

      <View style={[s.main, item.suggestPlan && s.mainTop]}>
        <Pressable
          onLongPress={menu ? holdForMenu : undefined}
          delayLongPress={350}
          disabled={!menu}
          accessibilityActions={menu ? [{ name: 'menu', label: voice.rowMenuLabel }] : undefined}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'menu' && menu?.()}
          style={s.text}
          {...rightClick}>
          <Text variant="item" color={done ? c.muted : c.ink} style={done && s.struck}>
            {item.title}
          </Text>
          {/* Ternaries, not &&: an empty string outside <Text> crashes on native. */}
          {item.meta ? (
            <Text variant="meta" color={c.muted}>
              {item.meta}
            </Text>
          ) : null}
          {item.rrule ? (
            <View style={s.repeat}>
              <Icon name="repeat" size={12} color={c.muted} strokeWidth={2} />
              <Text variant="meta" color={c.muted}>
                {describeRRule(item.rrule)}
              </Text>
            </View>
          ) : null}
        </Pressable>
        {item.suggestPlan && !done && (
          <Pressable
            onPress={() => onPlan?.(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`${actions.planIt}: ${item.title}`}
            style={({ pressed }) => [s.planIt, pressed && s.pressed]}>
            <Icon name="shrink" size={13} color={c.primaryText} strokeWidth={2} />
            <Text variant="button" color={c.primaryText}>
              {actions.planIt}
            </Text>
          </Pressable>
        )}
      </View>

      {done ? (
        <View style={s.stamped} aria-hidden>
          <Text variant="labelSmall" color={c.stamp.terracotta} style={s.stampedText}>
            {voice.stamped.toUpperCase()}
          </Text>
        </View>
      ) : item.minutes || item.time ? (
        <View style={s.side}>
          {item.minutes ? (
            <Text variant="label" color={c.muted} style={s.duration}>
              {item.minutes} min
            </Text>
          ) : null}
          {item.time ? (
            <Text variant="label" color={c.muted} style={s.time}>
              {item.time}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 },
    rowTop: { alignItems: 'flex-start', paddingBottom: 10 },
    rule: { borderBottomWidth: 1, borderBottomColor: t.c.rule },
    check: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    unchecked: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: t.c.checkbox },
    checked: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: t.c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    main: { flex: 1, gap: 2 },
    mainTop: { gap: 6, paddingTop: 11 },
    text: { gap: 2 },
    struck: { textDecorationLine: 'line-through' },
    repeat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    planIt: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: t.hitTarget,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.c.primary,
      borderRadius: t.radii.pill,
      backgroundColor: t.c.card,
    },
    side: { alignItems: 'flex-end', gap: 3 },
    duration: {
      letterSpacing: 0,
      backgroundColor: t.c.chip,
      borderRadius: t.radii.chip,
      paddingHorizontal: 6,
      paddingVertical: 1,
      overflow: 'hidden',
    },
    time: { letterSpacing: 0 },
    stamped: {
      transform: [{ rotate: '-7deg' }],
      borderWidth: 1.5,
      borderColor: t.c.stamp.terracotta,
      borderRadius: t.radii.chip,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    stampedText: { letterSpacing: 1.26 },
    pressed: { opacity: 0.7 },
  }),
});
