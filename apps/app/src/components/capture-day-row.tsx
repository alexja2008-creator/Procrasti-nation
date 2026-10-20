import { dayChips, relativeDayLabel, relativeDayPhrase, voice, type LocalDate } from '@pn/core';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = {
  label: string;
  /** The picked day, shown on its chip. */
  day: LocalDate | null;
  today: LocalDate;
  /** What a screen reader hears for a chip: "Start tomorrow", "Due tomorrow". */
  spoken: (day: string) => string;
  onPick: (day: LocalDate) => void;
  onCalendar: () => void;
  /** The Start row's Later. */
  later?: { selected: boolean; onPress: () => void };
};

/** The + sheet's rows (Alex, 2026-10-20): "Start · Today · Tomorrow · Pick a date · Later", and the Due row without Later. */
export function DayRow({ label, day, today, spoken, onPick, onCalendar, later }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const quick = dayChips(today);
  const other = day && !quick.some((d) => d.date === day) ? day : null;
  return (
    <View style={s.row}>
      {/* Each chip says "Start today" to a screen reader. */}
      <Text variant="label" color={c.muted} style={s.label} aria-hidden>
        {label.toUpperCase()}
      </Text>
      {quick.map((d) => (
        <Chip
          key={d.id}
          label={d.label}
          accessibilityLabel={spoken(relativeDayPhrase(d.date, today))}
          selected={day === d.date}
          onPress={() => onPick(d.date)}
        />
      ))}
      <Chip
        label={other ? relativeDayLabel(other, today) : voice.task.pickDate}
        accessibilityLabel={other ? spoken(relativeDayPhrase(other, today)) : voice.task.pickDate}
        selected={!!other}
        onPress={onCalendar}
      />
      {later ? (
        <Chip label={voice.task.later} accessibilityLabel={spoken(voice.task.later.toLowerCase())} selected={later.selected} onPress={later.onPress} />
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    label: { minWidth: 40 },
  }),
});
