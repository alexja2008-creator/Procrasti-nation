import { relativeDayPhrase, voice, type LocalDate, type Task } from '@pn/core';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.briefing;

type Props = {
  task: Task;
  today: LocalDate;
  onToday: () => void;
  onPick: () => void;
  onLetGo: () => void;
};

type PillProps = {
  label: string;
  onPress: () => void;
  primary?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  expanded?: boolean;
};

/** The briefing's small action buttons. */
export function ActionPill({ label, onPress, primary, accessibilityLabel, accessibilityHint, expanded }: PillProps) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [s.action, primary && s.actionPrimary, pressed && s.pressed]}>
      <Text variant="button" color={primary ? c.onPrimary : c.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

/** One thing that carried over: its title, the day it came from, and where it goes now. */
export function LeftoverRow({ task, today, onToday, onPick, onLetGo }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const came = task.scheduledOn
    ? copy.from(relativeDayPhrase(task.scheduledOn, today))
    : task.dueOn
      ? copy.wasDue(relativeDayPhrase(task.dueOn, today))
      : null;
  const pill = (label: string, onPress: () => void, primary = false) => (
    <ActionPill label={label} onPress={onPress} primary={primary} accessibilityLabel={copy.actionFor(label, task.title)} />
  );

  return (
    <View style={s.row}>
      <Text variant="item">{task.title}</Text>
      {came ? (
        <Text variant="meta" color={c.muted}>
          {came}
        </Text>
      ) : null}
      <View style={s.actions}>
        {pill(copy.today, onToday, true)}
        {pill(copy.pickDay, onPick)}
        {pill(copy.letGo, onLetGo)}
      </View>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    row: { gap: 3, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.c.rule },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    action: {
      minHeight: 36,
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: t.radii.pill,
      borderWidth: 1,
      borderColor: t.c.outline,
      backgroundColor: t.c.card,
    },
    actionPrimary: { backgroundColor: t.c.primary, borderColor: t.c.primary },
    pressed: { opacity: 0.7 },
  }),
});
