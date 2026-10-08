import {
  defaultStartMinutes,
  formatPhone,
  hoursChange,
  nudgeTones,
  voice,
  type Hours,
  type NudgeToneId,
  type Persona,
  type Preferences,
  type ProcrastinationStyle,
  type StartMinutes,
} from '@pn/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { isUnsaved } from '@/auth/passport';
import { signOut } from '@/auth/sign-out';
import { ChoiceCards, type Choice } from '@/components/application/choice-cards';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { RemindersCard } from '@/components/reminders-card';
import { SavePassport } from '@/components/save-passport';
import { Screen } from '@/components/screen';
import { DeleteSheet } from '@/components/settings/delete-sheet';
import { PasswordSheet } from '@/components/settings/password-sheet';
import { SettingRow } from '@/components/settings/setting-row';
import { SettingsCard } from '@/components/settings/settings-card';
import { UsernameSheet } from '@/components/settings/username-sheet';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { downloadMyData } from '@/data/account';
import { fetchUsername } from '@/data/profile';
import { useUserSettings } from '@/data/user-settings';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.settings;
const passport = voice.application;
const answers = voice.application;

const tones: Choice<NudgeToneId>[] = (Object.keys(nudgeTones) as NudgeToneId[]).map((id) => ({
  id,
  label: nudgeTones[id].name,
  hint: nudgeTones[id].blurb,
  sample: nudgeTones[id].samples[0],
}));

const TIMERS: StartMinutes[] = [2, 5, 10, 25];
const DAY_ENDS = [0, 1, 2, 3, 4, 5, 6];

type Picking = 'purpose' | 'hours' | 'style' | 'tone' | 'timer' | 'dayEnds' | 'username' | 'password' | 'save' | 'signOut' | 'delete' | null;

const labelOf = <T extends string>(choices: readonly { id: T; label: string }[], id: T | undefined) =>
  choices.find((c) => c.id === id)?.label ?? copy.notSet;

const close = () => (router.canGoBack() ? router.back() : router.replace('/passport'));

/** Every Citizenship Application answer, Start Mode's timer, when the day ends, reminders, the account. */
export default function SettingsScreen() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { session } = useAuth();
  const unsaved = isUnsaved(session?.user);
  // Signed in with an email, or a texted code (a passport saved by phone has no email).
  const signedInAs = session?.user.email || (session?.user.phone ? formatPhone(`+${session.user.phone.replace(/^\+/, '')}`) : null);
  const { settings, savePreferences, saveSettings } = useUserSettings();
  const prefs: Partial<Preferences> = settings?.preferences ?? {};
  const [picking, setPicking] = useState<Picking>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = session?.user.id;
  const [username, setUsername] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const download = async () => {
    if (!session || exporting) return;
    setExporting(true);
    setError(null);
    try {
      await downloadMyData(session.user, settings);
    } catch {
      setError(copy.downloadFailed);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchUsername(userId).then(
      (name) => !cancelled && setUsername(name),
      () => undefined, // the row shows "Choose one"; saving still works
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** Applies at once (the stores roll back if the save fails). */
  const save = (work: () => Promise<unknown>) => {
    setPicking(null);
    setError(null);
    work().catch(() => setError(copy.saveFailed));
  };

  const pickHours = (hours: Hours) =>
    save(() => {
      const change = hoursChange(hours, prefs);
      return Promise.all([savePreferences(change.preferences), saveSettings({ dayRolloverHour: change.dayRolloverHour })]);
    });

  const automatic = defaultStartMinutes({ style: prefs.style });
  const rollover = settings?.dayRolloverHour ?? 0;
  const dayEndsLabel = (h: number) => (h === 0 ? copy.midnight : copy.hourAM(h));

  return (
    <Screen>
      <View style={s.topBar}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={copy.close} style={s.iconButton}>
          <Icon name="close" color={c.ink} />
        </Pressable>
      </View>
      <Text variant="pageTitle" accessibilityRole="header">
        {copy.title}
      </Text>
      {error ? (
        <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <SettingsCard label={copy.applicationLabel}>
        <SettingRow label={copy.purpose} value={labelOf(answers.purposes, prefs.persona)} onPress={() => setPicking('purpose')} />
        <SettingRow label={copy.hours} value={labelOf(answers.hours, prefs.hours)} onPress={() => setPicking('hours')} />
        <SettingRow label={copy.style} value={labelOf(answers.styles, prefs.style)} onPress={() => setPicking('style')} />
        <SettingRow label={copy.tone} value={labelOf(tones, prefs.nudgeTone)} onPress={() => setPicking('tone')} last />
      </SettingsCard>

      <SettingsCard label={copy.startLabel}>
        <SettingRow
          label={copy.timer}
          value={prefs.startMinutes ? copy.minutes(prefs.startMinutes) : copy.automatic(automatic)}
          onPress={() => setPicking('timer')}
          last
        />
      </SettingsCard>

      <SettingsCard label={copy.dayLabel}>
        <SettingRow label={copy.dayEnds} value={dayEndsLabel(rollover)} onPress={() => setPicking('dayEnds')} last />
      </SettingsCard>

      <RemindersCard />

      <SettingsCard label={copy.accountLabel}>
        {unsaved ? (
          <SettingRow label={passport.saveAction} value={passport.notSaved} onPress={() => setPicking('save')} />
        ) : (
          <>
            <SettingRow label={copy.username} value={username ?? copy.usernameNone} onPress={() => setPicking('username')} />
            <SettingRow label={copy.password} value={copy.passwordValue} onPress={() => setPicking('password')} />
          </>
        )}
        <SettingRow label={copy.downloadData} value={exporting ? copy.preparingData : copy.downloadValue} onPress={download} />
        <SettingRow label={copy.deletePassport} value="" onPress={() => setPicking('delete')} />
        <View style={s.account}>
          {signedInAs ? (
            <Text variant="meta" color={c.muted}>
              {voice.signIn.signedInAs(signedInAs)}
            </Text>
          ) : null}
          {/* Signing out of a passport that isn't saved loses it: say so first. */}
          <Button variant="secondary" label={voice.signIn.signOut} onPress={unsaved ? () => setPicking('signOut') : signOut} />
        </View>
      </SettingsCard>

      {picking === 'purpose' ? (
        <Sheet title={copy.purpose} onClose={() => setPicking(null)} width={440}>
          <Text variant="meta" color={c.muted} style={s.note}>
            {copy.purposeNote}
          </Text>
          <ChoiceCards<Persona>
            label={copy.purpose}
            choices={answers.purposes}
            selected={prefs.persona}
            onPick={(persona) => save(() => savePreferences({ persona }))}
          />
        </Sheet>
      ) : picking === 'hours' ? (
        <Sheet title={copy.hours} onClose={() => setPicking(null)} width={440}>
          <ChoiceCards<Hours> label={copy.hours} choices={answers.hours} selected={prefs.hours} onPick={pickHours} />
        </Sheet>
      ) : picking === 'style' ? (
        <Sheet title={copy.style} onClose={() => setPicking(null)} width={440}>
          <ChoiceCards<ProcrastinationStyle>
            label={copy.style}
            choices={answers.styles}
            selected={prefs.style}
            onPick={(style) => save(() => savePreferences({ style }))}
          />
        </Sheet>
      ) : picking === 'tone' ? (
        <Sheet title={copy.tone} onClose={() => setPicking(null)} width={440}>
          <ChoiceCards<NudgeToneId>
            label={copy.tone}
            choices={tones}
            selected={prefs.nudgeTone}
            onPick={(nudgeTone) => save(() => savePreferences({ nudgeTone }))}
          />
        </Sheet>
      ) : picking === 'timer' ? (
        <Sheet title={copy.timer} onClose={() => setPicking(null)}>
          <Text variant="meta" color={c.muted} style={s.note}>
            {copy.timerLead}
          </Text>
          <View style={s.chips}>
            <Chip
              label={copy.automaticChoice}
              selected={!prefs.startMinutes}
              onPress={() => save(() => savePreferences({ startMinutes: undefined }))}
            />
            {TIMERS.map((m) => (
              <Chip
                key={m}
                label={copy.minutes(m)}
                selected={prefs.startMinutes === m}
                onPress={() => save(() => savePreferences({ startMinutes: m }))}
              />
            ))}
          </View>
        </Sheet>
      ) : picking === 'username' && userId ? (
        <UsernameSheet userId={userId} current={username} onSaved={setUsername} onClose={() => setPicking(null)} />
      ) : picking === 'password' ? (
        <PasswordSheet onClose={() => setPicking(null)} />
      ) : picking === 'save' ? (
        <Sheet title={passport.saveAction} onClose={() => setPicking(null)} width={440}>
          <View style={s.sheetBody}>
            <Text variant="meta" color={c.muted}>
              {passport.saveLead}
            </Text>
            <SavePassport onDone={() => setPicking(null)} />
          </View>
        </Sheet>
      ) : picking === 'delete' && userId ? (
        <DeleteSheet userId={userId} onDownload={download} downloading={exporting} onClose={() => setPicking(null)} />
      ) : picking === 'signOut' ? (
        <Sheet title={passport.signOutUnsavedTitle} onClose={() => setPicking(null)}>
          <View style={s.sheetBody}>
            <Text variant="body" color={c.inkSoft}>
              {passport.signOutUnsavedBody}
            </Text>
            <Button label={passport.saveAction} onPress={() => setPicking('save')} />
            <Button variant="quiet" label={passport.signOutAnyway} onPress={signOut} />
          </View>
        </Sheet>
      ) : picking === 'dayEnds' ? (
        <Sheet title={copy.dayEnds} onClose={() => setPicking(null)}>
          <Text variant="meta" color={c.muted} style={s.note}>
            {copy.dayLead}
          </Text>
          <View style={s.chips}>
            {DAY_ENDS.map((h) => (
              <Chip
                key={h}
                label={dayEndsLabel(h)}
                selected={rollover === h}
                onPress={() => save(() => saveSettings({ dayRolloverHour: h }))}
              />
            ))}
          </View>
        </Sheet>
      ) : null}
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    topBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: -12 },
    iconButton: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    account: { gap: 10, alignItems: 'flex-start', paddingTop: 6, paddingBottom: 12 },
    note: { marginBottom: 10 },
    sheetBody: { gap: 12, paddingVertical: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  }),
});
