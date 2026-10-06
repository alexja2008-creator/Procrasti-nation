import { longDateLabel, monthGrid, monthLabel, parseLocalDate, shiftMonth, voice, type LocalDate } from '@pn/core';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Props = { selected: LocalDate | null; today: LocalDate; onSelect: (day: LocalDate) => void };

/** A month at a time, Monday first. Today is ringed; the chosen day is filled. */
export function MonthCalendar({ selected, today, onSelect }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [view, setView] = useState(() => {
    const d = parseLocalDate(selected ?? today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const move = (delta: number) => setView((v) => shiftMonth(v.year, v.month, delta));

  return (
    <View style={s.calendar}>
      <View style={s.head}>
        <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel={voice.task.previousMonth} style={s.arrow}>
          <Icon name="chevronLeft" size={18} color={c.ink} strokeWidth={1.9} />
        </Pressable>
        <Text variant="item" accessibilityRole="header" accessibilityLiveRegion="polite">
          {monthLabel(view.year, view.month)}
        </Text>
        <Pressable onPress={() => move(1)} accessibilityRole="button" accessibilityLabel={voice.task.nextMonth} style={s.arrow}>
          <Icon name="chevronRight" size={18} color={c.ink} strokeWidth={1.9} />
        </Pressable>
      </View>
      <View style={s.row} aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} variant="labelSmall" color={c.muted} style={s.weekday}>
            {d}
          </Text>
        ))}
      </View>
      {monthGrid(view.year, view.month).map((week, w) => (
        <View key={w} style={s.row}>
          {week.map((day, i) => {
            if (!day) return <View key={i} style={s.cell} />;
            const chosen = day === selected;
            return (
              <Pressable
                key={day}
                onPress={() => onSelect(day)}
                accessibilityRole="button"
                accessibilityLabel={longDateLabel(day)}
                accessibilityState={{ selected: chosen }}
                style={s.cell}>
                <View style={[s.dot, day === today && s.today, chosen && s.chosen]}>
                  <Text variant="body" color={chosen ? c.onPrimary : day < today ? c.muted : c.ink}>
                    {Number(day.slice(8))}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
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
    dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    today: { borderWidth: 1.5, borderColor: t.c.primary },
    chosen: { backgroundColor: t.c.primary, borderColor: t.c.primary },
  }),
});
