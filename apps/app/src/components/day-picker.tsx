import { dayChips, longDateLabel, relativeDayLabel, voice, type LocalDate } from '@pn/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { MonthCalendar } from '@/components/month-calendar';

type Props = {
  /** The picked day; null is "No date"; undefined is nothing picked yet (the Oath). */
  day: LocalDate | null | undefined;
  today: LocalDate;
  onChange: (day: LocalDate | null) => void;
  /** Offer "No date", which clears the day. */
  allowNone?: boolean;
  /** Days before this one can't be picked (a Declaration is for later). */
  from?: LocalDate;
};

/**
 * Today · Tomorrow · Pick a date (· No date) everywhere a day is chosen (Alex,
 * 2026-10-15). Pick a date opens the month in place; once a day is picked
 * there, its chip shows it ("Thu 22 Oct"), and tapping it opens the month again.
 */
export function DayPicker({ day, today, onChange, allowNone, from }: Props) {
  const chips = dayChips(today);
  const other = day && !chips.some((c) => c.date === day) ? day : null;
  const [open, setOpen] = useState(false);

  const pick = (d: LocalDate | null) => {
    setOpen(false);
    onChange(d);
  };

  return (
    <View>
      <View style={s.chips}>
        {chips.map((chip) => (
          <Chip key={chip.id} label={chip.label} selected={day === chip.date} onPress={() => pick(chip.date)} />
        ))}
        <Chip
          label={other ? relativeDayLabel(other, today) : voice.task.pickDate}
          accessibilityLabel={other ? voice.task.pickedDate(longDateLabel(other)) : voice.task.pickDate}
          selected={!!other}
          onPress={() => setOpen((v) => !v)}
        />
        {allowNone ? <Chip label={voice.task.noDate} selected={day === null} onPress={() => pick(null)} /> : null}
      </View>
      {open ? <MonthCalendar selected={day ?? null} today={today} onSelect={pick} from={from} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
});
