import { relativeDayPhrase, voice, type BriefingPick, type LocalDate } from '@pn/core';
import { Pressable, StyleSheet, View } from 'react-native';

import { cameFrom } from '@/components/briefing/leftover-row';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.briefing;

type Props = {
  pick: BriefingPick;
  today: LocalDate;
  ticked: boolean;
  /** Three are ticked: an unticked one waits (a tap says to untick one first). */
  full: boolean;
  onToggle: () => void;
};

/**
 * Something a long briefing offers for today: a tick box (square, so it never reads as Done), its
 * title, and under it its plan, where it came from and a deadline still ahead.
 */
export function PickRow({ pick, today, ticked, full, onToggle }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { task, plan, deadline } = pick;
  const waiting = full && !ticked;
  const meta = [plan?.title, cameFrom(task, today), deadline ? copy.dueBy(relativeDayPhrase(deadline, today)) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: ticked, disabled: waiting }}
      // React Native Web only exposes the tick through aria-checked.
      aria-checked={ticked}
      accessibilityLabel={meta ? `${task.title}, ${meta}` : task.title}
      accessibilityHint={waiting ? copy.pickFull : undefined}
      style={({ pressed }) => [s.row, waiting && s.waiting, pressed && s.pressed]}>
      <View style={[s.box, ticked && s.boxTicked]}>
        {ticked ? <Icon name="check" size={13} color={c.onPrimary} strokeWidth={3} /> : null}
      </View>
      <View style={s.text}>
        <Text variant="item">{task.title}</Text>
        {meta ? (
          <Text variant="meta" color={c.muted}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.c.rule },
    box: {
      width: 22,
      height: 22,
      marginTop: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: t.c.checkbox,
    },
    boxTicked: { backgroundColor: t.c.primary, borderColor: t.c.primary },
    text: { flex: 1, gap: 3 },
    waiting: { opacity: 0.45 },
    pressed: { opacity: 0.7 },
  }),
});
