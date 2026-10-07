import {
  APPLICATION_PAGES,
  formatCitizenNumber,
  morningListOf,
  morningTimeFor,
  nudgeTones,
  resumePage,
  rolloverFor,
  territoriesFor,
  voice,
  type ApplicationPage,
  type Hours,
  type NudgeToneId,
  type Persona,
  type Preferences,
  type ProcrastinationStyle,
} from '@pn/core';
import { useRef, useState } from 'react';
import { StyleSheet, View, type ScrollView } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { personName } from '@/auth/person-name';
import { ApplicationForm } from '@/components/application/application-form';
import { ChoiceCards, type Choice } from '@/components/application/choice-cards';
import { Button } from '@/components/button';
import { LandingStamp } from '@/components/landing-stamp';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useLists } from '@/data/lists-store';
import { useUserSettings } from '@/data/user-settings';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.application;

/** Long enough to see the pick land before the page turns. */
const TURN_MS = 260;
/**
 * A press that turns the page (Begin, Continue, Back) can land a second time
 * on whatever the new page has under the pointer (the browser's click follows
 * the press that already turned it), so answers wait this long after a turn.
 */
const SETTLE_MS = 400;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const tones: Choice<NudgeToneId>[] = (Object.keys(nudgeTones) as NudgeToneId[]).map((id) => ({
  id,
  label: nudgeTones[id].name,
  hint: nudgeTones[id].blurb,
  sample: nudgeTones[id].samples[0],
}));

/**
 * The Citizenship Application: a few questions the first time someone opens
 * the app (or until they skip). Each answer is saved as it's picked, so
 * leaving halfway keeps what's done; finishing (or skipping) opens Today.
 */
export default function ApplicationScreen() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { session } = useAuth();
  const { settings, savePreferences, saveSettings } = useUserSettings();
  const { lists, status: listsStatus, add } = useLists();
  const prefs: Partial<Preferences> = settings?.preferences ?? {};
  const scroll = useRef<ScrollView>(null);
  const [page, setPage] = useState<ApplicationPage>(() => resumePage(prefs));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const turnedAt = useRef(0);

  const index = APPLICATION_PAGES.indexOf(page);
  const go = (to: ApplicationPage) => {
    turnedAt.current = Date.now();
    setError(null);
    setPage(to);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const next = () => go(APPLICATION_PAGES[index + 1]);
  const back = () => go(APPLICATION_PAGES[index - 1]);

  /** Saves an answer, then turns the page (stays put, with a message, if the save fails). */
  const answer = async (save: () => Promise<unknown>) => {
    if (busy || Date.now() - turnedAt.current < SETTLE_MS) return;
    setBusy(true);
    setError(null);
    try {
      await Promise.all([save(), pause(TURN_MS)]);
      next();
    } catch {
      setError(copy.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const pickHours = (hours: Hours) =>
    answer(() => {
      const morning = morningListOf(prefs);
      return Promise.all([
        // The morning list keeps its time once it's on; until then it follows their hours.
        savePreferences({ hours, reminders: { ...prefs.reminders, morningList: morning.on ? morning : { ...morning, ...morningTimeFor(hours) } } }),
        saveSettings({ dayRolloverHour: rolloverFor(hours) }),
      ]);
    });

  /** Done (or skipped): their territories, then Today (the gate lets them through once it's saved). */
  const finish = async (skipped: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!skipped && prefs.persona && listsStatus === 'ready' && lists.length === 0) {
        for (const territory of territoriesFor(prefs.persona)) await add(territory);
      }
      await saveSettings({ onboardingCompletedAt: new Date().toISOString() });
    } catch {
      setError(copy.saveFailed);
      setBusy(false);
    }
  };

  const citizenNo = settings ? formatCitizenNumber(settings.citizenNumber) : '';
  const backButton = <Button variant="quiet" label={copy.back} onPress={back} disabled={busy} />;

  return (
    <Screen scrollRef={scroll}>
      <View style={s.page}>
        {page === 'welcome' ? (
          <ApplicationForm
            page={page}
            title={copy.welcomeTitle}
            lead={copy.welcomeBody}
            error={error}
            footer={
              <>
                <Button variant="quiet" label={copy.skip} onPress={() => finish(true)} disabled={busy} />
                <Button label={copy.begin} onPress={next} disabled={busy} />
              </>
            }>
            {citizenNo ? (
              <Text variant="label" color={c.primaryText} style={s.reserved}>
                {copy.reserved(citizenNo).toUpperCase()}
              </Text>
            ) : null}
          </ApplicationForm>
        ) : page === 'purpose' ? (
          <ApplicationForm page={page} title={copy.purposeTitle} lead={copy.pickOne} error={error} footer={backButton}>
            <ChoiceCards<Persona>
              label={copy.purposeTitle}
              choices={copy.purposes}
              selected={prefs.persona}
              disabled={busy}
              onPick={(persona) => answer(() => savePreferences({ persona }))}
            />
          </ApplicationForm>
        ) : page === 'hours' ? (
          <ApplicationForm page={page} title={copy.hoursTitle} lead={copy.pickOne} error={error} footer={backButton}>
            <ChoiceCards<Hours> label={copy.hoursTitle} choices={copy.hours} selected={prefs.hours} disabled={busy} onPick={pickHours} />
          </ApplicationForm>
        ) : page === 'style' ? (
          <ApplicationForm page={page} title={copy.styleTitle} lead={copy.pickOne} error={error} footer={backButton}>
            <ChoiceCards<ProcrastinationStyle>
              label={copy.styleTitle}
              choices={copy.styles}
              selected={prefs.style}
              disabled={busy}
              onPick={(style) => answer(() => savePreferences({ style }))}
            />
          </ApplicationForm>
        ) : page === 'notBroken' ? (
          <ApplicationForm
            page={page}
            title={copy.notBrokenTitle}
            footer={
              <>
                {backButton}
                <Button label={copy.next} onPress={next} />
              </>
            }>
            {copy.notBroken.map((paragraph) => (
              <Text key={paragraph} variant="lead" color={c.inkSoft}>
                {paragraph}
              </Text>
            ))}
            <Text variant="meta" color={c.muted}>
              {copy.notBrokenSource}
            </Text>
          </ApplicationForm>
        ) : page === 'tone' ? (
          <ApplicationForm page={page} title={copy.toneTitle} lead={copy.pickOne} error={error} footer={backButton}>
            <ChoiceCards<NudgeToneId>
              label={copy.toneTitle}
              choices={tones}
              selected={prefs.nudgeTone}
              disabled={busy}
              onPick={(nudgeTone) => answer(() => savePreferences({ nudgeTone }))}
            />
          </ApplicationForm>
        ) : (
          <View style={s.approved} accessibilityLiveRegion="polite">
            <LandingStamp ink={c.stamp.terracotta} lines={copy.approvedStamp} style={s.stamp} />
            <Text variant="pageTitle" accessibilityRole="header" style={s.centered}>
              {copy.approvedTitle(personName(session?.user).first)}
            </Text>
            <Text variant="lead" color={c.inkSoft} style={s.centered}>
              {copy.approvedBody(citizenNo)}
            </Text>
            {error ? (
              <Text variant="meta" color={c.error} style={s.centered}>
                {error}
              </Text>
            ) : null}
            <Button label={copy.goToToday} onPress={() => finish(false)} disabled={busy} />
          </View>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    page: { paddingBottom: 24 },
    reserved: { letterSpacing: 1.2 },
    approved: { gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 12 },
    stamp: { alignSelf: 'center', marginBottom: 8 },
    centered: { textAlign: 'center' },
  }),
});
