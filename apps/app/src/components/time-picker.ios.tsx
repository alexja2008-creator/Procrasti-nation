import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { pickerHours, pickHour } from '@pn/core';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import type { TimePickerProps } from '@/components/time-picker';
import { useTokens } from '@/theme/tokens';

// The wheel works on a whole date; any fixed day will do for a time of day.
const onBaseDay = (hour: number, minute: number) => new Date(2000, 0, 1, hour, minute);

/**
 * The iPhone's time picker: iOS's own wheel, any minute (Alex, 2026-10-15; the
 * web has an hour grid instead, time-picker.tsx). A wheel always shows a time,
 * so with none picked yet it opens on 6 PM (or the first quarter hour still
 * ahead) and picks it, so what's shown is what's saved.
 */
export function TimePicker({ time, onChange, after = null }: TimePickerProps) {
  const t = useTokens();
  const first = after ? pickHour(pickerHours(after)[0] ?? -1, null, after) : { hour: 18, minute: 0 };
  const shown = time ?? first;
  const [firstHour, firstMinute] = first ? [first.hour, first.minute] : [null, null];

  useEffect(() => {
    if (!time && firstHour !== null && firstMinute !== null) onChange({ hour: firstHour, minute: firstMinute });
  }, [time, firstHour, firstMinute, onChange]);

  if (!shown) return null;
  return (
    <DateTimePicker
      mode="time"
      display="spinner"
      value={onBaseDay(shown.hour, shown.minute)}
      minimumDate={after ? onBaseDay(after.hour, after.minute + 1) : undefined}
      onValueChange={(_, date) => onChange({ hour: date.getHours(), minute: date.getMinutes() })}
      themeVariant={t.scheme === 'night' ? 'dark' : 'light'}
      accentColor={t.c.primary}
      style={s.wheel}
    />
  );
}

const s = StyleSheet.create({
  wheel: { alignSelf: 'stretch' },
});
