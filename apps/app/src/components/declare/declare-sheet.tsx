import {
  clockOf,
  dayChips,
  declarePatch,
  declaredWhen,
  formatCitizenNumber,
  formatTime,
  isAhead,
  localDateString,
  names,
  sameTime,
  startSoon,
  timeChips,
  timeSlots,
  undoPatch,
  voice,
  type ClockTime,
  type LocalDate,
  type Task,
} from '@pn/core';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { personName } from '@/auth/person-name';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { isSigned, NO_SIGNATURE, SignaturePad, type Signature } from '@/components/declare/signature-pad';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useTasks } from '@/data/tasks-store';
import { useUserSettings } from '@/data/user-settings';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.declaration;
const clockLabel = (t: ClockTime) => formatTime(new Date(2000, 0, 1, t.hour, t.minute));
// A start time to the quarter hour.
const SLOTS = timeSlots(6, 23, 15);

/**
 * A Declaration: pick a day and a start time, sign the line, Declare. The time becomes the
 * task's When (its reminder rings in a "you declared this" voice); Undo puts the old one back.
 */
export function DeclareSheet({ task, onClose }: { task: Task; onClose: () => void }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, update, notify } = useTasks();
  const { session } = useAuth();
  const { settings } = useUserSettings();
  // The moment the sheet opened: times before it are gone (a Declaration is for later). Its days
  // are the calendar's, not a night owl's rolled-over day: at 12:30 AM, "today at 4 PM" is this afternoon.
  const [opened] = useState(() => new Date());
  const today = localDateString(opened);
  const firstDay = task.scheduledOn && task.scheduledOn > today ? task.scheduledOn : today;
  const kept = task.remindAt && task.scheduledOn === firstDay ? clockOf(task.remindAt) : null;
  const [day, setDay] = useState<LocalDate>(firstDay);
  const [time, setTime] = useState<ClockTime | null>(kept && isAhead(firstDay, kept, opened) ? kept : null);
  const [otherTime, setOtherTime] = useState(false);
  const [signature, setSignature] = useState<Signature>(NO_SIGNATURE);

  const ahead = (d: LocalDate, t: ClockTime) => isAhead(d, t, opened);
  const soon = startSoon(opened);
  const days = dayChips(today).filter((chip, i, all) => all.findIndex((x) => x.date === chip.date) === i);
  const signedName =
    personName(session?.user).full ??
    (settings?.citizenNumber ? `${copy.signedFallback} ${formatCitizenNumber(settings.citizenNumber)}` : copy.signedFallback);

  const pickDay = (d: LocalDate) => {
    setDay(d);
    if (time && !ahead(d, time)) setTime(null);
  };
  const pickSoon = () => {
    setDay(soon.day);
    setTime(soon.time);
    setOtherTime(false);
  };

  const ready = !!time && ahead(day, time) && isSigned(signature);
  const declare = () => {
    if (!time || !ready) return;
    const latest = tasks.find((x) => x.id === task.id) ?? task;
    const patch = declarePatch(day, time, new Date());
    update(latest, patch);
    notify(copy.declared(latest.title, declaredWhen(day, time, today)), () => update({ ...latest, ...patch }, undoPatch(latest, patch)));
    onClose();
  };

  const isSoon = !!time && day === soon.day && sameTime(time, soon.time);
  const custom = !!time && !isSoon && !timeChips.some((t) => sameTime(t.time, time));

  return (
    <Sheet
      title={names.declaration}
      onClose={onClose}
      width={440}
      footer={
        // The signature line sits with Declare, out of the scrolling part (a stroke is never a scroll).
        <View style={s.footer}>
          <SignaturePad value={signature} onChange={setSignature} name={signedName} />
          <Button label={copy.declare} disabled={!ready} onPress={declare} />
        </View>
      }>
      <Text variant="step" style={s.statement} accessibilityLiveRegion="polite">
        {time ? copy.statement(task.title, declaredWhen(day, time, today)) : copy.statementOpen(task.title)}
      </Text>
      <Text variant="meta" color={c.muted}>
        {copy.why}
      </Text>

      <Text variant="label" color={c.muted} style={s.section}>
        {copy.day.toUpperCase()}
      </Text>
      <View style={s.chips}>
        {days.map((chip) => (
          <Chip key={chip.id} label={chip.label} selected={day === chip.date} onPress={() => pickDay(chip.date)} />
        ))}
      </View>

      <Text variant="label" color={c.muted} style={s.section}>
        {copy.time.toUpperCase()}
      </Text>
      <View style={s.chips}>
        {day === soon.day ? <Chip label={copy.soon} selected={isSoon} onPress={pickSoon} /> : null}
        {timeChips
          .filter((chip) => ahead(day, chip.time))
          .map((chip) => (
            <Chip
              key={chip.id}
              label={`${chip.label} · ${clockLabel(chip.time)}`}
              selected={!isSoon && sameTime(time, chip.time)}
              onPress={() => {
                setTime(chip.time);
                setOtherTime(false);
              }}
            />
          ))}
        <Chip label={custom && time ? clockLabel(time) : copy.otherTime} selected={custom} onPress={() => setOtherTime((v) => !v)} />
      </View>
      {otherTime ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.slots}>
          {SLOTS.filter((slot) => ahead(day, slot)).map((slot) => (
            <Chip key={clockLabel(slot)} label={clockLabel(slot)} selected={sameTime(time, slot)} onPress={() => setTime(slot)} />
          ))}
        </ScrollView>
      ) : null}
    </Sheet>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    statement: { paddingTop: 2, paddingBottom: 4 },
    section: { marginTop: 10 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 6 },
    slots: { gap: 8, paddingBottom: 6 },
    footer: { gap: 4, paddingBottom: 4 },
  }),
});
