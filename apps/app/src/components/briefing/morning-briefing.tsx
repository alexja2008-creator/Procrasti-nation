import { briefingOf, linesFor, names, voice, type LocalDate } from '@pn/core';
import { useEffect, useEffectEvent, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BriefingSheet } from '@/components/briefing/briefing-sheet';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { fetchYesterday, loadPutOff, savePutOff } from '@/data/briefing';
import { useTasks } from '@/data/tasks-store';
import { useUserSettings } from '@/data/user-settings';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.briefing;

type Props = {
  userId: string;
  /** Opened from the morning list notification: show the briefing itself (Not now aside). */
  openOnArrival?: boolean;
  /** Called once the arrival is handled, so a later visit to Today doesn't open it again. */
  onArrived?: () => void;
};

/**
 * The Morning Briefing's card on Today: shown while something carried over from
 * before today, until it's sorted or put off for the day (Not now, this device).
 * Yesterday's recap leads, in true numbers, when there is one.
 */
export function MorningBriefing({ userId, openOnArrival = false, onArrived }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, today, rolloverHour, status } = useTasks();
  const { settings } = useUserSettings();
  const [open, setOpen] = useState(false);
  // undefined while loading, so the card never flashes in and out.
  const [putOffOn, setPutOffOn] = useState<LocalDate | null | undefined>(undefined);
  const [recap, setRecap] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadPutOff(userId).then((day) => {
      if (live) setPutOffOn(day);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  // Yesterday, once per day. A failed count just leaves the recap out.
  useEffect(() => {
    let live = true;
    fetchYesterday(userId, today, rolloverHour).then(
      (r) => live && setRecap(copy.recap(r.finished, r.starts)),
      () => live && setRecap(null),
    );
    return () => {
      live = false;
    };
  }, [userId, today, rolloverHour]);

  const count = briefingOf(tasks, today).count;

  // From the morning notification: straight to the briefing if anything carried over, once per
  // tap (set while rendering, React's way to adjust state to a prop), then the param is cleared.
  const [arrived, setArrived] = useState(false);
  if (openOnArrival && status === 'ready' && !arrived) {
    setArrived(true);
    if (count > 0) setOpen(true);
  }
  if (!openOnArrival && arrived) setArrived(false);
  const clearArrival = useEffectEvent(() => onArrived?.());
  useEffect(() => {
    if (arrived) clearArrival();
  }, [arrived]);

  const putOff = () => {
    setPutOffOn(today);
    savePutOff(userId, today);
  };

  // Once open, the sheet stays until closed, even when the last thing is sorted ("All sorted.").
  const showCard = status === 'ready' && count > 0 && putOffOn !== undefined && putOffOn !== today;

  return (
    <>
      {showCard ? (
        <View style={s.card}>
          <Text variant="label" color={c.muted} accessibilityRole="header">
            {names.morningBriefing.toUpperCase()}
          </Text>
          {recap ? (
            <Text variant="meta" color={c.primaryText}>
              {recap}
            </Text>
          ) : null}
          <Text variant="body" color={c.inkSoft}>
            {linesFor(settings?.preferences.nudgeTone).briefingLead(count)}
          </Text>
          <View style={s.buttons}>
            <View style={s.sort}>
              <Button label={copy.sort(count)} onPress={() => setOpen(true)} />
            </View>
            <Button variant="quiet" label={copy.notNow} onPress={putOff} />
          </View>
        </View>
      ) : null}
      {open ? <BriefingSheet recap={recap} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    card: {
      gap: 8,
      padding: 16,
      backgroundColor: t.c.card,
      borderWidth: 1,
      borderColor: t.c.pageBorder,
      borderRadius: t.radii.card,
    },
    buttons: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
    sort: { flexShrink: 1 },
  }),
});
