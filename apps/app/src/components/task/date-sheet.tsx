import {
  describeRRule,
  formatTime,
  formatTimeShort,
  parseWhen,
  sameTime,
  timeChips,
  voice,
  type ClockTime,
  type LocalDate,
} from '@pn/core';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { DayPicker } from '@/components/day-picker';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { TimePicker } from '@/components/time-picker';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.task;
const clockLabel = (t: ClockTime) => formatTime(new Date(2000, 0, 1, t.hour, t.minute));

type Props = {
  title: string;
  day: LocalDate | null;
  time: ClockTime | null;
  today: LocalDate;
  /** "every weekday 7am" may be typed (the When field). */
  allowRepeat?: boolean;
  /** Where a typed repeat lands when it changes the task's weekdays (`daysChangeLanding`), so the day shown is the day saved. */
  landOn?: (rrule: string) => LocalDate | null;
  /** Null day clears the field; `rrule` is set only when a repeat was typed. */
  onSave: (day: LocalDate | null, time: ClockTime | null, rrule?: string) => void;
  onClose: () => void;
};

/** Pick a day (Today, Tomorrow, or the calendar) and, optionally, a time. */
export function DateSheet({ title, day: initialDay, time: initialTime, today, allowRepeat, landOn, onSave, onClose }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [day, setDay] = useState(initialDay);
  const [time, setTime] = useState(initialTime);
  const custom = time && !timeChips.some((t) => sameTime(t.time, time));
  const [otherTime, setOtherTime] = useState(!!custom);
  const [typed, setTyped] = useState('');
  const [rrule, setRRule] = useState<string | null>(null);

  // Typing updates the chips and calendar as it's understood.
  const type = (text: string) => {
    setTyped(text);
    const p = parseWhen(text.trim());
    const typedDay = p.matches.some((m) => m.kind === 'date' || m.kind === 'due');
    const d = (allowRepeat && p.rrule && !typedDay && landOn?.(p.rrule)) || p.scheduledOn || p.dueOn;
    if (d) setDay(d);
    if (p.time) setTime(p.time);
    setRRule(allowRepeat ? p.rrule : null);
  };

  // A time needs a day: picking one first assumes today.
  const pickTime = (t: ClockTime | null) => {
    setTime(t);
    if (t && !day) setDay(today);
    else if (!t) setOtherTime(false);
  };

  return (
    <Sheet
      title={title}
      onClose={onClose}
      width={420}
      footer={
        <View style={s.footer}>
          <Button variant="quiet" label={copy.clear} onPress={() => onSave(null, null)} />
          <View style={s.done}>
            <Button label={copy.done} onPress={() => onSave(day, day ? time : null, rrule ?? undefined)} />
          </View>
        </View>
      }>
      <TextInput
        value={typed}
        onChangeText={type}
        placeholder={copy.typeIt}
        placeholderTextColor={c.muted}
        accessibilityLabel={copy.typeIt}
        autoCapitalize="none"
        autoCorrect={false}
        style={[s.t.text.body, s.typeIt]}
      />
      {rrule ? (
        <Text variant="meta" color={c.primaryText}>
          {copy.repeats(describeRRule(rrule))}
        </Text>
      ) : null}
      <DayPicker day={day} today={today} onChange={setDay} allowNone />

      <Text variant="label" color={c.muted} style={s.section}>
        {copy.time.toUpperCase()}
      </Text>
      <View style={s.chips}>
        {timeChips.map((chip) => (
          <Chip
            key={chip.id}
            label={`${chip.label} · ${formatTimeShort(chip.time.hour, chip.time.minute)}`}
            selected={sameTime(time, chip.time)}
            onPress={() => pickTime(chip.time)}
          />
        ))}
        <Chip label={copy.noTime} selected={!time} onPress={() => pickTime(null)} />
        <Chip label={custom && time ? clockLabel(time) : copy.otherTime} selected={!!custom} onPress={() => setOtherTime((v) => !v)} />
      </View>
      {otherTime ? <TimePicker time={time} onChange={pickTime} /> : null}
    </Sheet>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
    typeIt: {
      minHeight: 44,
      paddingHorizontal: 12,
      marginVertical: 6,
      color: t.c.ink,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
    },
    section: { marginTop: 8 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    done: { flex: 1 },
  }),
});
