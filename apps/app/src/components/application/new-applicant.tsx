import { APPLICATION_PAGES, hoursChange, resumePage, voice, type HeardFrom, type Hours, type Preferences } from '@pn/core';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type ScrollView } from 'react-native';

import { openPassport } from '@/auth/passport';
import { isQuizPage, QuizPages, type QuizPage } from '@/components/application/quiz-pages';
import { useTurns } from '@/components/application/use-turns';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { loadDraft, saveDraft, type Draft } from '@/data/application-draft';
import { useTokens } from '@/theme/tokens';

const copy = voice.application;

/**
 * The Application for someone new, signed out: the questions, answered on this device. Picking
 * where they heard about us opens their anonymous passport; the screen then comes back signed in
 * (`welcome.tsx`), moves these answers into it and carries on at the Oath.
 */
export function NewApplicant() {
  const t = useTokens();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    loadDraft().then(setDraft);
  }, []);

  if (!draft) {
    return (
      <Screen>
        <ActivityIndicator color={t.c.primary} style={styles.loading} />
      </Screen>
    );
  }
  return <Questions initial={draft} />;
}

function Questions({ initial }: { initial: Draft }) {
  const t = useTokens();
  const scroll = useRef<ScrollView>(null);
  const [draft, setDraft] = useState(initial);
  // Everything answered already (the passport didn't open last time): back to the last question.
  const resume = resumePage(initial.preferences);
  const { turnedTo, go, answer, busy, setBusy, error, setError, settled } = useTurns(isQuizPage(resume) ? resume : 'heardFrom', scroll, copy.saveFailed);
  const page = turnedTo as QuizPage;
  const index = APPLICATION_PAGES.indexOf(page);
  const next = () => go(APPLICATION_PAGES[index + 1]);
  const back = () => go(APPLICATION_PAGES[index - 1]);

  const keep = async (preferences: Partial<Preferences>, dayRolloverHour?: number) => {
    const updated: Draft = {
      preferences: { ...draft.preferences, ...preferences },
      dayRolloverHour: dayRolloverHour ?? draft.dayRolloverHour,
    };
    setDraft(updated);
    await saveDraft(updated);
  };

  const onHours = (hours: Hours) =>
    answer(() => {
      const change = hoursChange(hours, draft.preferences);
      return keep(change.preferences, change.dayRolloverHour);
    }, next);

  // The last question: keep the answer, then open the passport (the screen comes back signed in).
  const onHeardFrom = async (heardFrom: HeardFrom) => {
    if (!settled()) return;
    setBusy(true);
    setError(null);
    await keep({ heardFrom });
    try {
      await openPassport();
    } catch {
      setError(copy.passportFailed);
      setBusy(false);
    }
  };

  return (
    <Screen scrollRef={scroll}>
      <View style={styles.page}>
        <QuizPages
          page={page}
          prefs={draft.preferences}
          busy={busy}
          error={error}
          welcomeFooter={
            <>
              <Button variant="quiet" label={copy.alreadyCitizen} onPress={() => router.push('/sign-in')} />
              <Button label={copy.begin} onPress={next} />
            </>
          }
          onAnswer={(patch) => answer(() => keep(patch), next)}
          onHours={onHours}
          onHeardFrom={onHeardFrom}
          next={next}
          back={back}
        />
        {busy && page === 'heardFrom' ? (
          <View style={styles.opening} accessibilityLiveRegion="polite">
            <ActivityIndicator color={t.c.primary} />
            <Text variant="label" color={t.c.muted}>
              {copy.openingPassport.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 48 },
  page: { paddingBottom: 24, gap: 16 },
  opening: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
