import { monthLabel, parseLocalDate, shiftWeek, voice, weekStrip, type LocalDate } from '@pn/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CalendarHead, DayCell, WeekdayRow } from '@/components/month-calendar';

type Props = {
  /** A day in the week shown first. */
  start: LocalDate;
  today: LocalDate;
  selected: LocalDate | null;
  /** How many items fall on each day; drawn as dots. */
  marks: Record<LocalDate, number>;
  onSelect: (day: LocalDate) => void;
};

/** One week of the month calendar, Monday first, with arrows to the weeks around it. */
export function WeekStrip({ start, today, selected, marks, onSelect }: Props) {
  const [anchor, setAnchor] = useState(start);
  const days = weekStrip(anchor);
  // Name the month most of the week falls in (its Thursday's).
  const thursday = parseLocalDate(days[3]);

  return (
    <View style={styles.strip}>
      <CalendarHead
        label={monthLabel(thursday.getFullYear(), thursday.getMonth())}
        previous={voice.upcoming.previousWeek}
        next={voice.upcoming.nextWeek}
        onMove={(delta) => setAnchor((a) => shiftWeek(a, delta))}
      />
      <WeekdayRow />
      <View style={styles.row}>
        {days.map((day) => (
          <DayCell key={day} day={day} today={today} selected={selected} count={marks[day]} onSelect={onSelect} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 2 },
  row: { flexDirection: 'row' },
});
