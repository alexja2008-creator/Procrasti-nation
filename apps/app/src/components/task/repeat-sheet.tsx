import {
  describeRRule,
  monthlyChoiceLabel,
  monthlyChoices,
  monthlyOf,
  parseLocalDate,
  parseRRule,
  pickerWeek,
  repeatChips,
  voice,
  weeklyInterval,
  weeklyOf,
  weeklyRule,
  type LocalDate,
} from '@pn/core';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = {
  rrule: string | null;
  /** The day a "weekly" repeat follows, and Every month…'s choices are worked out from. */
  anchor: LocalDate;
  onSave: (rrule: string | null) => void;
  onClose: () => void;
};

/**
 * One tap: never, every day, every weekday, every week on this day. Every
 * month… opens choices worked out from the task's day: on the 20th, on the third
 * Tuesday, on the 1st, on the last day (Alex's plan, 2026-10-20). Or Pick days…:
 * seven toggles, Monday first, for "Mon, Wed and Sat" and for changing them
 * later (family testing, 2026-10-15). A repeat on its own days shows ticked
 * there, so tapping a one-day choice never quietly drops days.
 */
export function RepeatSheet({ rrule, anchor, onSave, onClose }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const options = [
    { id: 'never', label: voice.task.never, rrule: null as string | null },
    ...repeatChips(anchor).filter((o) => o.id !== 'monthly'),
  ];
  // The monthly repeat this is (an old plain "every month" reads as its current day), always among
  // the choices ("On the 31st" while it sits on the 30th), ticked, so tapping it changes nothing.
  const monthly = monthlyOf(rrule, anchor);
  const monthChoices = monthlyChoices(anchor, monthly ? parseRRule(monthly).interval : 1);
  if (monthly && !monthChoices.some((m) => m.rrule === monthly)) {
    monthChoices.unshift({ id: monthly, rrule: monthly, label: monthlyChoiceLabel(monthly) });
  }
  const [choosingMonth, setChoosingMonth] = useState(!!monthly);
  const weekly = weeklyOf(rrule);
  // Any weekly repeat that isn't a one-tap choice ("Mon, Wed, Sat", "every 2 weeks") is its own days.
  const interval = weeklyInterval(rrule);
  const own = !options.some((o) => o.rrule === rrule) && interval !== null;
  const [picking, setPicking] = useState(own);
  const [days, setDays] = useState<number[]>(weekly?.days ?? [parseLocalDate(anchor).getDay()]);
  const toggle = (day: number) => setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const row = (key: string, label: string, chosen: boolean, onPress: () => void, detail?: string, inner?: boolean) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      // React Native Web only exposes the current repeat through aria-selected.
      aria-selected={chosen}
      style={({ pressed }) => [s.option, inner && s.inner, pressed && s.pressed]}>
      <View style={s.label}>
        <Text variant="item">{label}</Text>
        {detail ? (
          <Text variant="meta" color={c.muted}>
            {detail}
          </Text>
        ) : null}
      </View>
      {chosen ? <Icon name="check" size={18} color={c.primaryText} strokeWidth={2.2} /> : null}
    </Pressable>
  );

  return (
    <Sheet title={voice.task.repeat} onClose={onClose}>
      {options.map((o) => row(o.id, o.label, o.rrule === rrule, () => onSave(o.rrule)))}
      {row('monthly', voice.task.everyMonth, !!monthly, () => setChoosingMonth((v) => !v), monthly ? describeRRule(monthly) : undefined)}
      {choosingMonth ? monthChoices.map((m) => row(m.id, m.label, m.rrule === monthly, () => onSave(m.rrule), undefined, true)) : null}
      {row('days', voice.task.pickDays, own, () => setPicking((v) => !v), own && rrule ? describeRRule(rrule) : undefined)}
      {picking ? (
        <View style={s.picker}>
          <View style={s.week} role="group" aria-label={voice.task.repeatDays}>
            {pickerWeek.map(({ day, short, long }) => {
              const on = days.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggle(day)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  // React Native Web ignores accessibilityState: aria-checked says it.
                  aria-checked={on}
                  accessibilityLabel={long}
                  style={({ pressed }) => [s.day, on && s.dayOn, pressed && s.pressed]}>
                  <Text variant="button" color={on ? c.onPrimary : c.ink}>
                    {short}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {/* No days is no repeat: Never says that. */}
          <Button label={voice.task.save} disabled={!days.length} onPress={() => onSave(weeklyRule(days, interval ?? 1))} />
        </View>
      ) : null}
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
    label: { flex: 1, gap: 2, paddingVertical: 6 },
    // Every month…'s choices sit under it.
    inner: { paddingLeft: 20 },
    pressed: { opacity: 0.7 },
    picker: { gap: 12, paddingTop: 4, paddingBottom: 8 },
    week: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
    day: {
      flex: 1,
      minHeight: t.hitTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.c.outline,
      borderRadius: t.radii.pill,
      backgroundColor: t.c.bg,
    },
    dayOn: { backgroundColor: t.c.primary, borderColor: t.c.primary },
  }),
});
