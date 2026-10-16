import {
  clockOf,
  declarePatch,
  declaredWhen,
  formatCitizenNumber,
  formatTime,
  isAhead,
  localDateString,
  sameTime,
  startSoon,
  timeChips,
  undoPatch,
  voice,
  type ClockTime,
  type LocalDate,
  type Task,
} from '@pn/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { personName } from '@/auth/person-name';
import { Chip } from '@/components/chip';
import { DayPicker } from '@/components/day-picker';
import { isSigned, NO_SIGNATURE, type Signature } from '@/components/declare/signature-pad';
import { Text } from '@/components/text';
import { TimePicker } from '@/components/time-picker';
import { awardFirstDeclaration } from '@/data/stamps';
import { useTasks } from '@/data/tasks-store';
import { useUserSettings } from '@/data/user-settings';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.declaration;
const clockLabel = (t: ClockTime) => formatTime(new Date(2000, 0, 1, t.hour, t.minute));

/**
 * A Declaration being made for `task`: the day, the start time and the signature, and `declare()`,
 * which signs the task's When (with Undo). Shared by the Declare sheet and the Application's first
 * Declaration.
 */
export function useDeclaration(task: Task) {
  const { tasks, update, notify } = useTasks();
  const { session } = useAuth();
  const { settings } = useUserSettings();
  // The moment it opened: times before it are gone (a Declaration is for later). Its days are the
  // calendar's, not a later Day ends at's rolled-over day: at 12:30 AM, "today at 4 PM" is this afternoon.
  const [opened] = useState(() => new Date());
  const today = localDateString(opened);
  const firstDay = task.scheduledOn && task.scheduledOn > today ? task.scheduledOn : today;
  const kept = task.remindAt && task.scheduledOn === firstDay ? clockOf(task.remindAt) : null;
  const [day, setDay] = useState<LocalDate>(firstDay);
  const [time, setTime] = useState<ClockTime | null>(kept && isAhead(firstDay, kept, opened) ? kept : null);
  const [signature, setSignature] = useState<Signature>(NO_SIGNATURE);

  const signedName =
    personName(session?.user).full ??
    (settings?.citizenNumber ? `${copy.signedFallback} ${formatCitizenNumber(settings.citizenNumber)}` : copy.signedFallback);
  const ready = !!time && isAhead(day, time, opened) && isSigned(signature);
  const statement = time ? copy.statement(task.title, declaredWhen(day, time, today)) : copy.statementOpen(task.title);

  /** Signs it; false when there's no time ahead or no signature yet. */
  const declare = (): boolean => {
    if (!time || !ready) return false;
    const latest = tasks.find((x) => x.id === task.id) ?? task;
    const patch = declarePatch(day, time, new Date());
    update(latest, patch);
    notify(copy.declared(latest.title, declaredWhen(day, time, today)), () => update({ ...latest, ...patch }, undoPatch(latest, patch)));
    // "Declaration signed" for the first one ever (later ones are turned away); Undo doesn't take it back.
    if (session) awardFirstDeclaration(session.user.id).catch(() => undefined);
    return true;
  };

  return { opened, today, day, setDay, time, setTime, signature, setSignature, signedName, ready, statement, declare };
}

export type Declaration = ReturnType<typeof useDeclaration>;

/** The day and start-time chips: only times still ahead, "In 15 min" on its day, and Other time (the hour grid, or the iPhone's wheel). */
export function DeclarationChoices({ d }: { d: Declaration }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [otherTime, setOtherTime] = useState(false);
  const { opened, today, day, setDay, time, setTime } = d;
  const ahead = (on: LocalDate, t: ClockTime) => isAhead(on, t, opened);
  const soon = startSoon(opened);
  // Times before the moment it opened are gone today; any time counts on a later day.
  const after = day === today ? { hour: opened.getHours(), minute: opened.getMinutes() } : null;
  const isSoon = !!time && day === soon.day && sameTime(time, soon.time);
  const custom = !!time && !isSoon && !timeChips.some((t) => sameTime(t.time, time));

  const pickDay = (on: LocalDate) => {
    setDay(on);
    if (time && !ahead(on, time)) setTime(null);
  };
  const pickTime = (t: ClockTime) => {
    setTime(t);
    setOtherTime(false);
  };

  return (
    <View>
      <Text variant="label" color={c.muted} style={s.section}>
        {copy.day.toUpperCase()}
      </Text>
      <DayPicker day={day} today={today} onChange={(on) => on && pickDay(on)} from={today} />

      <Text variant="label" color={c.muted} style={s.section}>
        {copy.time.toUpperCase()}
      </Text>
      <View style={s.chips}>
        {day === soon.day ? (
          <Chip
            label={copy.soon}
            selected={isSoon}
            onPress={() => {
              setDay(soon.day);
              pickTime(soon.time);
            }}
          />
        ) : null}
        {timeChips
          .filter((chip) => ahead(day, chip.time))
          .map((chip) => (
            <Chip
              key={chip.id}
              label={`${chip.label} · ${clockLabel(chip.time)}`}
              selected={!isSoon && sameTime(time, chip.time)}
              onPress={() => pickTime(chip.time)}
            />
          ))}
        <Chip label={custom && time ? clockLabel(time) : copy.otherTime} selected={custom} onPress={() => setOtherTime((v) => !v)} />
      </View>
      {otherTime ? <TimePicker time={time} onChange={setTime} after={after} /> : null}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    section: { marginTop: 10 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 6 },
  }),
});
