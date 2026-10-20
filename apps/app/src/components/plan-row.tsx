import { voice, type PlanGroup } from '@pn/core';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import type { TaskRowItem } from '@/components/task-row';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.today;

type Props = {
  group: PlanGroup;
  /** The plan's own row: title, meta (territory, deadline), time. */
  item: TaskRowItem;
  expanded: boolean;
  onExpand: (id: string) => void;
  /** Every step done: mark the plan itself done (it asks, never on its own). */
  onFinish: (id: string) => void;
  onMenu?: (id: string) => void;
  onOpen?: (id: string) => void;
  /** Its steps, shown when expanded (rows Today draws, with their checkboxes; finished ones struck through). */
  children: ReactNode;
  last?: boolean;
};

/**
 * A plan on Today: one row however many steps it has (Alex, 2026-10-14), progress where a task's
 * checkbox would be, so a tap never finishes seven steps at once. Its steps open under it.
 */
export function PlanRow({ group, item, expanded, onExpand, onFinish, onMenu, onOpen, children, last }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { plan, done, total, readyToFinish, finished } = group;
  const open = !finished && !readyToFinish;
  // The toggle counts what's left for today; finished steps show under it too, struck through.
  const forToday = group.steps.filter((e) => !e.done).length;

  const menu = onMenu && !finished ? () => onMenu(plan.id) : undefined;
  const holdForMenu = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    menu?.();
  };
  // react-native-web passes onContextMenu through; RN's types don't know it.
  const rightClick =
    Platform.OS === 'web' && menu ? ({ onContextMenu: (e: { preventDefault: () => void }) => (e.preventDefault(), menu()) } as object) : {};

  return (
    <View style={!last && s.rule}>
      <View style={s.row}>
        <View style={s.progress} accessible accessibilityLabel={copy.stepsProgressSpoken(done, total)}>
          {finished ? (
            <View style={s.checked}>
              <Icon name="check" size={13} color={c.onPrimary} strokeWidth={3} />
            </View>
          ) : (
            <View style={[s.pill, readyToFinish && s.pillReady]}>
              <Text variant="labelSmall" color={readyToFinish ? c.primaryText : c.inkSoft} style={s.fraction}>
                {`${done}/${total}`}
              </Text>
            </View>
          )}
        </View>

        <View style={s.main}>
          <Pressable
            onPress={onOpen ? () => onOpen(plan.id) : undefined}
            onLongPress={menu ? holdForMenu : undefined}
            delayLongPress={350}
            disabled={!menu && !onOpen}
            accessibilityRole={onOpen ? 'button' : undefined}
            accessibilityActions={menu ? [{ name: 'menu', label: voice.rowMenuLabel }] : undefined}
            onAccessibilityAction={(e) => e.nativeEvent.actionName === 'menu' && menu?.()}
            style={s.text}
            {...rightClick}>
            <Text variant="item" color={finished ? c.muted : c.ink} style={finished && s.struck}>
              {item.title}
            </Text>
            <Text variant="meta" color={c.muted}>
              {[copy.stepsProgress(done, total), item.meta].filter(Boolean).join(' · ')}
            </Text>
          </Pressable>

          {readyToFinish ? (
            <View style={s.ask}>
              <Text variant="meta" color={c.primaryText}>
                {copy.allStepsDone(total)}
              </Text>
              <Button variant="secondary" label={copy.markPlanDone} onPress={() => onFinish(plan.id)} />
            </View>
          ) : open && group.steps.length > 0 ? (
            <Pressable
              onPress={() => onExpand(plan.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              style={({ pressed }) => [s.toggle, pressed && s.pressed]}>
              <Text variant="button" color={c.primaryText}>
                {expanded ? copy.hideSteps : copy.showSteps(forToday)}
              </Text>
              <View style={expanded && s.chevronOpen}>
                <Icon name="chevronRight" size={14} color={c.primaryText} strokeWidth={2} />
              </View>
            </Pressable>
          ) : null}
        </View>

        {finished ? (
          <View style={s.stamped} aria-hidden>
            <Text variant="labelSmall" color={c.stamp.terracotta} style={s.stampedText}>
              {voice.stamped.toUpperCase()}
            </Text>
          </View>
        ) : item.time ? (
          <View style={s.side}>
            <Text variant="label" color={c.muted} style={s.time}>
              {item.time}
            </Text>
            {item.declared ? (
              <View style={s.declared}>
                <Text variant="labelSmall" color={c.stamp.violet} style={s.stampedText}>
                  {voice.declaration.mark.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {expanded && open ? <View style={s.steps}>{children}</View> : null}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 5 },
    rule: { borderBottomWidth: 1, borderBottomColor: t.c.rule },
    progress: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    // Shaped like the checkbox it stands in for.
    pill: {
      minWidth: 34,
      height: 22,
      paddingHorizontal: 5,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: t.c.checkbox,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillReady: { borderColor: t.c.primary },
    fraction: { letterSpacing: 0 },
    checked: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: t.c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    main: { flex: 1, gap: 2, paddingTop: 11 },
    text: { gap: 2 },
    struck: { textDecorationLine: 'line-through' },
    toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: t.hitTarget },
    chevronOpen: { transform: [{ rotate: '90deg' }] },
    ask: { gap: 8, paddingVertical: 6, alignItems: 'flex-start' },
    steps: { marginLeft: t.hitTarget / 2, paddingLeft: 6, borderLeftWidth: 1, borderLeftColor: t.c.rule, marginBottom: 6 },
    side: { alignItems: 'flex-end', gap: 3, paddingTop: 11 },
    time: { letterSpacing: 0 },
    stamped: {
      marginTop: 11,
      transform: [{ rotate: '-7deg' }],
      borderWidth: 1.5,
      borderColor: t.c.stamp.terracotta,
      borderRadius: t.radii.chip,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    stampedText: { letterSpacing: 1.26 },
    declared: {
      transform: [{ rotate: '-4deg' }],
      borderWidth: 1,
      borderColor: t.c.stamp.violet,
      borderRadius: t.radii.chip,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    pressed: { opacity: 0.7 },
  }),
});
