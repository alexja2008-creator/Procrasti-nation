import { formatTime, formatTimeShort, pickerHours, pickHour, quarterLabel, quartersOf, sameTime, type ClockTime } from '@pn/core';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';

const spoken = (t: ClockTime) => formatTime(new Date(2000, 0, 1, t.hour, t.minute));

/** Shared with the iPhone's wheel (time-picker.ios.tsx), so both take the same props. */
export type TimePickerProps = {
  time: ClockTime | null;
  onChange: (time: ClockTime) => void;
  /** Only times later than this (a Declaration's times already gone today). */
  after?: ClockTime | null;
};

/**
 * Any time by the quarter hour with no scrolling, for a mouse, a keyboard or a
 * thumb: tap an hour (6 AM to 11 PM), then :00 :15 :30 :45. The web's picker;
 * the iPhone has a wheel (time-picker.ios.tsx). A horizontal strip of times
 * couldn't be scrolled with a mouse (family testing, 2026-10-15).
 */
export function TimePicker({ time, onChange, after = null }: TimePickerProps) {
  const hours = pickerHours(after);
  const hour = time && hours.includes(time.hour) ? time.hour : null;
  const pick = (h: number) => {
    const t = pickHour(h, time, after);
    if (t) onChange(t);
  };

  return (
    <View>
      <View style={s.chips}>
        {hours.map((h) => (
          <Chip key={h} label={formatTimeShort(h, 0)} selected={hour === h} onPress={() => pick(h)} />
        ))}
      </View>
      {hour !== null ? (
        <View style={s.chips}>
          {quartersOf(hour, after).map((t) => (
            <Chip
              key={t.minute}
              label={quarterLabel(t.minute)}
              accessibilityLabel={spoken(t)}
              selected={sameTime(time, t)}
              onPress={() => onChange(t)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
});
