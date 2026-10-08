import { briefingOf, linesFor, names, voice, type LocalDate } from '@pn/core';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BriefingSheet } from '@/components/briefing/briefing-sheet';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { loadPutOff, savePutOff } from '@/data/briefing';
import { useTasks } from '@/data/tasks-store';
import { useUserSettings } from '@/data/user-settings';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.briefing;

/**
 * The Morning Briefing's card on Today: shown while something carried over from
 * before today, until it's sorted or put off for the day (Not now, this device).
 */
export function MorningBriefing({ userId }: { userId: string }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, today, status } = useTasks();
  const { settings } = useUserSettings();
  const [open, setOpen] = useState(false);
  // undefined while loading, so the card never flashes in and out.
  const [putOffOn, setPutOffOn] = useState<LocalDate | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    loadPutOff(userId).then((day) => {
      if (live) setPutOffOn(day);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  const count = briefingOf(tasks, today).count;
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
      {open ? <BriefingSheet onClose={() => setOpen(false)} /> : null}
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
