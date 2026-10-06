import { repeatChips, voice, type LocalDate } from '@pn/core';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = {
  rrule: string | null;
  /** The day a "weekly" repeat follows. */
  anchor: LocalDate;
  onSave: (rrule: string | null) => void;
  onClose: () => void;
};

/** One tap: never, every day, every weekday, every week on this day, every month. */
export function RepeatSheet({ rrule, anchor, onSave, onClose }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const options = [{ id: 'never', label: voice.task.never, rrule: null as string | null }, ...repeatChips(anchor)];
  return (
    <Sheet title={voice.task.repeat} onClose={onClose}>
      {options.map((o) => {
        const chosen = o.rrule === rrule;
        return (
          <Pressable
            key={o.id}
            onPress={() => onSave(o.rrule)}
            accessibilityRole="button"
            accessibilityState={{ selected: chosen }}
            style={({ pressed }) => [s.option, pressed && s.pressed]}>
            <Text variant="item" style={s.label}>
              {o.label}
            </Text>
            {chosen ? <Icon name="check" size={18} color={c.primaryText} strokeWidth={2.2} /> : null}
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      paddingHorizontal: 4,
      borderTopWidth: 1,
      borderTopColor: t.c.rule,
    },
    label: { flex: 1 },
    pressed: { opacity: 0.7 },
  }),
});
