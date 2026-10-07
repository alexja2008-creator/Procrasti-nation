import { longDateLabel, monthGrid, monthLabel, parseLocalDate, shiftMonth, voice, type LocalDate } from '@pn/core';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
/** Most dots drawn under a day, however busy it is. */
const MAX_MARKS = 3;

type Props = {
  selected: LocalDate | null;
  today: LocalDate;
  onSelect: (day: LocalDate) => void;
  /** How many items fall on each day; drawn as up to three dots. */
  marks?: Record<LocalDate, number>;
};

/** A month at a time, Monday first. Today is ringed; the chosen day is filled. */
export function MonthCalendar({ selected, today, onSelect, marks }: Props) {
  const s = useStyles(makeStyles);
  const [view, setView] = useState(() => {
    const d = parseLocalDate(selected ?? today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const move = (delta: number) => setView((v) => shiftMonth(v.year, v.month, delta));

  return (
    <View style={s.calendar}>
      <CalendarHead
        label={monthLabel(view.year, view.month)}
        previous={voice.task.previousMonth}
        next={voice.task.nextMonth}
        onMove={move}
      />
      <WeekdayRow />
      {monthGrid(view.year, view.month).map((week, w) => (
        <View key={w} style={s.row}>
          {week.map((day, i) =>
            day ? (
              <DayCell key={day} day={day} today={today} selected={selected} count={marks?.[day]} onSelect={onSelect} />
            ) : (
              <View key={i} style={s.cell} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

/** "‹ October 2026 ›". Shared with the week strip. */
export function CalendarHead({ label, previous, next, onMove }: { label: string; previous: string; next: string; onMove: (delta: number) => void }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <View style={s.head}>
      <Pressable onPress={() => onMove(-1)} accessibilityRole="button" accessibilityLabel={previous} style={s.arrow}>
        <Icon name="chevronLeft" size={18} color={c.ink} strokeWidth={1.9} />
      </Pressable>
      <Text variant="item" accessibilityRole="header" accessibilityLiveRegion="polite">
        {label}
      </Text>
      <Pressable onPress={() => onMove(1)} accessibilityRole="button" accessibilityLabel={next} style={s.arrow}>
        <Icon name="chevronRight" size={18} color={c.ink} strokeWidth={1.9} />
      </Pressable>
    </View>
  );
}

export function WeekdayRow() {
  const s = useStyles(makeStyles);
  return (
    <View style={s.row} aria-hidden>
      {WEEKDAYS.map((d, i) => (
        <Text key={i} variant="labelSmall" color={s.t.c.muted} style={s.weekday}>
          {d}
        </Text>
      ))}
    </View>
  );
}

type DayProps = { day: LocalDate; today: LocalDate; selected: LocalDate | null; count?: number; onSelect: (day: LocalDate) => void };

export function DayCell({ day, today, selected, count = 0, onSelect }: DayProps) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const chosen = day === selected;
  const dots = Math.min(count, MAX_MARKS);
  return (
    <Pressable
      onPress={() => onSelect(day)}
      accessibilityRole="button"
      accessibilityLabel={count ? `${longDateLabel(day)}, ${voice.things(count)}` : longDateLabel(day)}
      accessibilityState={{ selected: chosen }}
      // React Native Web only exposes the picked day through aria-selected.
      aria-selected={chosen}
      style={s.cell}>
      <View style={[s.circle, day === today && s.today, chosen && s.chosen]}>
        <Text variant="body" color={chosen ? c.onPrimary : day < today ? c.muted : c.ink}>
          {Number(day.slice(8))}
        </Text>
        {dots ? (
          <View style={s.marks}>
            {Array.from({ length: dots }, (_, i) => (
              <View key={i} style={[s.mark, chosen && s.markChosen]} />
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    calendar: { gap: 2 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    arrow: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row' },
    weekday: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 4 },
    cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
    circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    today: { borderWidth: 1.5, borderColor: t.c.primary },
    chosen: { backgroundColor: t.c.primary, borderColor: t.c.primary },
    marks: { position: 'absolute', bottom: 3, flexDirection: 'row', gap: 2 },
    mark: { width: 4, height: 4, borderRadius: 2, backgroundColor: t.c.primary },
    markChosen: { backgroundColor: t.c.onPrimary },
  }),
});
