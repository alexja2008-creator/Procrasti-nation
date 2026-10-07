import {
  APPLICATION_PAGES,
  actions,
  formatCitizenNumber,
  hoursChange,
  oathTask,
  parseQuickAdd,
  resumePage,
  territoriesFor,
  voice,
  type Hours,
  type OathDue,
  type Preferences,
} from '@pn/core';
import { router } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View, type ScrollView } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { isUnsaved } from '@/auth/passport';
import { personName } from '@/auth/person-name';
import { FirstWeekPage, NudgePage } from '@/components/application/after-oath';
import { ApplicationForm } from '@/components/application/application-form';
import { NewApplicant } from '@/components/application/new-applicant';
import { isQuizPage, QuizPages } from '@/components/application/quiz-pages';
import { useTurns } from '@/components/application/use-turns';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { LandingStamp } from '@/components/landing-stamp';
import { SavePassport } from '@/components/save-passport';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { clearDraft, hasAnswers, loadDraft } from '@/data/application-draft';
import { useLists } from '@/data/lists-store';
import { awardCitizenship } from '@/data/stamps';
import { useTasks } from '@/data/tasks-store';
import { useUserSettings } from '@/data/user-settings';
import { useStyles, useTokens, type Tokens } from '@/theme/tokens';

const copy = voice.application;

/**
 * The Citizenship Application: a few questions the first time someone opens the app (or until
 * they skip). Someone new answers signed out (`NewApplicant`); their anonymous passport opens on
 * the way to the Oath, and this screen carries on signed in. Each answer is saved as it's picked,
 * so leaving halfway keeps what's done; finishing (or skipping) opens Today.
 */
export default function ApplicationScreen() {
  const { session } = useAuth();
  return session ? <Arrival /> : <NewApplicant />;
}

/** Signed in: first, any answers given signed out move into the passport (then they're cleared). */
function Arrival() {
  const t = useTokens();
  const { settings, status, savePreferences, saveSettings } = useUserSettings();
  const [moved, setMoved] = useState(false);
  const started = useRef(false);

  const move = useEffectEvent(async () => {
    try {
      const draft = await loadDraft();
      if (hasAnswers(draft) && !settings?.onboardingCompletedAt) {
        await savePreferences(draft.preferences);
        if (draft.dayRolloverHour !== undefined) await saveSettings({ dayRolloverHour: draft.dayRolloverHour });
      }
      await clearDraft();
    } catch {
      // answers that didn't move are asked again
    } finally {
      setMoved(true);
    }
  });
  useEffect(() => {
    if (status !== 'ready' || started.current) return;
    started.current = true;
    move();
  }, [status]);

  if (!moved) {
    return (
      <Screen>
        <View style={arrival.column} accessibilityLiveRegion="polite">
          <ActivityIndicator color={t.c.primary} />
          <Text variant="label" color={t.c.muted}>
            {copy.openingPassport.toUpperCase()}
          </Text>
        </View>
      </Screen>
    );
  }
  return <Application />;
}

function Application() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { session } = useAuth();
  const { settings, savePreferences, saveSettings } = useUserSettings();
  const { lists, status: listsStatus, add } = useLists();
  const { tasks, today, add: addTask } = useTasks();
  const prefs: Partial<Preferences> = settings?.preferences ?? {};
  const scroll = useRef<ScrollView>(null);
  const { turnedTo, go, answer, busy, setBusy, error, setError } = useTurns(resumePage(prefs), scroll, copy.saveFailed);
  const unsaved = isUnsaved(session?.user);
  // The Oath: what they typed, when it's due, and the task once it's made.
  const [oathText, setOathText] = useState('');
  const [oathDue, setOathDue] = useState<OathDue>('week');
  const [oathId, setOathId] = useState<string | null>(null);
  const oath = oathId ? tasks.find((t) => t.id === oathId) : undefined;
  const planned = !!oathId && tasks.some((t) => t.parentId === oathId && !t.deletedAt);
  // A plan accepted in Plan it (its steps land in the store) is the Oath taken: their first week shows underneath.
  const page = turnedTo === 'oath' && planned ? 'firstWeek' : turnedTo;

  const index = APPLICATION_PAGES.indexOf(page);
  const next = () => go(APPLICATION_PAGES[index + 1]);
  const back = () => go(APPLICATION_PAGES[index - 1]);

  const pickHours = (hours: Hours) =>
    answer(() => {
      const change = hoursChange(hours, prefs);
      return Promise.all([savePreferences(change.preferences), saveSettings({ dayRolloverHour: change.dayRolloverHour })]);
    }, next);

  /** Makes the Oath's task (once), then opens Plan it for it; accepting the plan comes back here. */
  const planOath = async () => {
    if (busy) return;
    let id = oathId;
    if (!id) {
      const text = oathText.trim();
      if (!text) return;
      setBusy(true);
      setError(null);
      const saved = await addTask(oathTask(parseQuickAdd(text, new Date(), { lists }), oathDue, today));
      setBusy(false);
      if (!saved) {
        setError(copy.saveFailed);
        return;
      }
      id = saved.id;
      setOathId(id);
    }
    router.push({ pathname: '/plan/[id]', params: { id, oath: '1' } });
  };

  /** Done (or skipped): their territories, then Today (the gate lets them through once it's saved). */
  const finish = async (skipped: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!skipped && prefs.persona && listsStatus === 'ready' && lists.length === 0) {
        for (const territory of territoriesFor(prefs.persona)) await add(territory);
      }
      // The stamp is for answering it: Skip earns nothing. A failure to stamp never blocks Today.
      const answered = !!(prefs.persona && prefs.hours && prefs.style && prefs.nudgeTone);
      if (!skipped && answered && session) await awardCitizenship(session.user.id).catch(() => undefined);
      await saveSettings({ onboardingCompletedAt: new Date().toISOString() }, { confirmFirst: true });
    } catch {
      setError(copy.saveFailed);
      setBusy(false);
    }
  };

  const citizenNo = settings ? formatCitizenNumber(settings.citizenNumber) : '';

  const content = isQuizPage(page) ? (
    <QuizPages
      page={page}
      prefs={prefs}
      busy={busy}
      error={error}
      welcomeNote={
        citizenNo ? (
          <Text variant="label" color={c.primaryText} style={s.reserved}>
            {copy.reserved(citizenNo).toUpperCase()}
          </Text>
        ) : null
      }
      welcomeFooter={
        <>
          <Button variant="quiet" label={copy.skip} onPress={() => finish(true)} disabled={busy} />
          <Button label={copy.begin} onPress={next} disabled={busy} />
        </>
      }
      onAnswer={(patch) => answer(() => savePreferences(patch), next)}
      onHours={pickHours}
      onHeardFrom={(heardFrom) => answer(() => savePreferences({ heardFrom }), next)}
      next={next}
      back={back}
    />
  ) : page === 'oath' ? (
    <ApplicationForm
      page={page}
      title={copy.oathTitle}
      lead={oath && !planned ? copy.oathAgain : copy.oathLead}
      error={error}
      footer={
        <>
          <Button variant="quiet" label={copy.back} onPress={back} disabled={busy} />
          <View style={s.actions}>
            <Button variant="quiet" label={copy.notNow} onPress={() => go('nudge')} disabled={busy} />
            <Button label={actions.planIt} onPress={planOath} disabled={busy || (!oath && !oathText.trim())} />
          </View>
        </>
      }>
      <TextInput
        value={oath ? oath.title : oathText}
        onChangeText={setOathText}
        editable={!oath}
        placeholder={copy.oathPlaceholder}
        placeholderTextColor={c.muted}
        accessibilityLabel={copy.oathTitle}
        returnKeyType="go"
        onSubmitEditing={planOath}
        style={s.input}
      />
      {oath ? null : (
        <>
          <Text variant="meta" color={c.muted}>
            {copy.oathHint}
          </Text>
          <Text variant="label" color={c.muted} style={s.dueLabel}>
            {copy.dueLabel.toUpperCase()}
          </Text>
          <View style={s.dues} accessibilityRole="radiogroup" accessibilityLabel={copy.dueLabel}>
            {copy.dues.map((d) => (
              <Chip key={d.id} label={d.label} selected={oathDue === d.id} onPress={() => setOathDue(d.id)} />
            ))}
          </View>
        </>
      )}
    </ApplicationForm>
  ) : page === 'firstWeek' && oathId ? (
    <FirstWeekPage planId={oathId} onContinue={next} />
  ) : page === 'firstWeek' || page === 'nudge' ? (
    <NudgePage onContinue={() => go('approved')} />
  ) : page === 'save' ? (
    <ApplicationForm page={page} title={copy.saveTitle} lead={copy.saveLead}>
      <SavePassport onDone={() => finish(false)} onLater={() => finish(false)} />
      {error ? (
        <Text variant="meta" color={c.error}>
          {error}
        </Text>
      ) : null}
    </ApplicationForm>
  ) : (
    <View style={s.approved} accessibilityLiveRegion="polite">
      <LandingStamp ink={c.stamp.forest} lines={voice.stampText.approved} size={270} style={s.stamp} />
      <Text variant="pageTitle" accessibilityRole="header" style={s.centered}>
        {copy.approvedTitle(personName(session?.user).first)}
      </Text>
      <Text variant="lead" color={c.inkSoft} style={s.centered}>
        {planned ? copy.approvedBodyOath(citizenNo) : copy.approvedBody(citizenNo)}
      </Text>
      {error ? (
        <Text variant="meta" color={c.error} style={s.centered}>
          {error}
        </Text>
      ) : null}
      {/* An anonymous passport is saved next; anyone else is done. */}
      {unsaved ? (
        <Button label={copy.next} onPress={() => go('save')} disabled={busy} />
      ) : (
        <Button label={copy.goToToday} onPress={() => finish(false)} disabled={busy} />
      )}
    </View>
  );

  return (
    <Screen scrollRef={scroll}>
      <View style={s.page}>{content}</View>
    </Screen>
  );
}

const arrival = StyleSheet.create({
  column: { alignItems: 'center', gap: 12, paddingTop: 48 },
});

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    page: { paddingBottom: 24 },
    reserved: { letterSpacing: 1.2 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    input: {
      minHeight: 52,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
      color: t.c.ink,
      fontFamily: t.fonts.body,
      fontSize: 17,
    },
    dueLabel: { marginTop: 4 },
    dues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    approved: { gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center', paddingTop: 12 },
    stamp: { alignSelf: 'center', marginBottom: 8 },
    centered: { textAlign: 'center' },
  }),
});
