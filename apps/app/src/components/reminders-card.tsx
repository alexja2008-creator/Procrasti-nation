import { formatTime, morningListOf, timeSlots, voice, type ClockTime, type MorningList } from '@pn/core';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useUserSettings } from '@/data/user-settings';
import { switchThumbOnWeb } from '@/lib/web-styles';
import { useReminders } from '@/notifications/reminders-provider';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.reminders;
const clockLabel = (t: ClockTime) => formatTime(new Date(2000, 0, 1, t.hour, t.minute));
/** Morning list times: 5:00 to 11:30 AM. */
const MORNING_SLOTS = timeSlots(5, 11);

/**
 * On the Passport tab until Settings exists: whether reminders are on for
 * this iPhone, and the morning list (saved with the person, so each of their
 * iPhones rings it). The web says reminders come to it next (Web Push).
 */
export function RemindersCard() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { permission, allow } = useReminders();
  const { settings, savePreferences } = useUserSettings();
  const morning = morningListOf(settings?.preferences);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const web = permission === 'unsupported';

  const saveMorning = (next: MorningList) => {
    setError(null);
    savePreferences({ reminders: { ...settings?.preferences.reminders, morningList: next } }).catch(() => setError(copy.saveFailed));
    // A morning list needs notifications: turning it on is a fine moment to ask.
    if (next.on && permission === 'undetermined') allow();
  };

  const status =
    permission === 'granted' ? copy.on : permission === 'undetermined' ? copy.off : permission === 'denied' ? copy.blocked : web ? copy.web : null;

  return (
    <View style={s.card}>
      <Text variant="label" color={c.muted} style={s.label}>
        {copy.cardLabel.toUpperCase()}
      </Text>
      {status ? (
        <Text variant="body" color={c.inkSoft}>
          {status}
        </Text>
      ) : null}
      {permission === 'undetermined' ? (
        <View style={s.action}>
          <Button variant="secondary" label={copy.turnOn} onPress={allow} />
        </View>
      ) : permission === 'denied' ? (
        <View style={s.action}>
          <Button variant="secondary" label={copy.openSettings} onPress={() => Linking.openSettings()} />
        </View>
      ) : null}

      <View style={s.rule} />
      <View style={s.row}>
        <View style={s.rowText}>
          <Text variant="item">{copy.morningList}</Text>
          <Text variant="meta" color={c.muted}>
            {web ? copy.morningLeadWeb : copy.morningLead}
          </Text>
        </View>
        <Switch
          value={morning.on}
          onValueChange={(on) => saveMorning({ ...morning, on })}
          disabled={!settings}
          trackColor={{ true: c.primary, false: c.toggle.trackOff }}
          thumbColor={c.toggle.thumb}
          {...switchThumbOnWeb(c.toggle.thumb)}
          ios_backgroundColor={c.toggle.trackOff}
          accessibilityLabel={copy.morningList}
        />
      </View>
      {morning.on ? (
        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityHint={copy.changeTime}
          style={({ pressed }) => [s.time, pressed && s.pressed]}>
          <Icon name="clock" size={16} color={c.primaryText} strokeWidth={1.9} />
          <Text variant="body" color={c.primaryText} style={s.timeText}>
            {copy.morningAt(clockLabel(morning))}
          </Text>
          <Icon name="chevronRight" size={16} color={c.muted} strokeWidth={1.9} />
        </Pressable>
      ) : null}
      {error ? (
        <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {picking ? (
        <Sheet title={copy.morningList} onClose={() => setPicking(false)} width={380}>
          <View style={s.slots}>
            {MORNING_SLOTS.map((slot) => (
              <Chip
                key={clockLabel(slot)}
                label={clockLabel(slot)}
                selected={slot.hour === morning.hour && slot.minute === morning.minute}
                onPress={() => {
                  setPicking(false);
                  saveMorning({ ...morning, ...slot });
                }}
              />
            ))}
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    card: {
      gap: 10,
      paddingTop: 14,
      paddingBottom: 16,
      paddingHorizontal: 18,
      backgroundColor: t.c.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      borderRadius: t.radii.card,
    },
    label: { letterSpacing: 1.5 },
    action: { alignItems: 'flex-start' },
    rule: { height: 1, backgroundColor: t.c.rule, marginVertical: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowText: { flex: 1, gap: 2 },
    time: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: t.hitTarget },
    timeText: { flex: 1 },
    pressed: { opacity: 0.7 },
    slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  }),
});
