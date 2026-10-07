import { actions, localDateString, planWindow, relativeDayLabel, voice, type LocalDate, type Task } from '@pn/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { clarifyingQuestions, generatePlan, resolveStepDates, savePlan, type Plan } from '@/data/plans';
import { useTasks } from '@/data/tasks-store';
import { useUserSettings } from '@/data/user-settings';
import { ApiError } from '@/lib/api';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.plan;

type Phase =
  | { kind: 'reading' }
  | { kind: 'questions' }
  | { kind: 'building' }
  | { kind: 'preview' | 'saving'; plan: Plan; dates: LocalDate[] }
  | { kind: 'failed'; message: string; canRetry: boolean };

/** `freeAgain`: the day their free plans come back (the next 30.5-day window). */
const failure = (e: unknown, freeAgain: string) =>
  e instanceof ApiError && e.status === 429
    ? { message: copy.limit(freeAgain), canRetry: false }
    : { message: copy.failed, canRetry: true };

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

async function buildPlan(task: Task, today: LocalDate, options: Parameters<typeof generatePlan>[2]) {
  const plan = await generatePlan(task, today, options);
  const dates = await resolveStepDates(plan, today, task.dueOn ?? plan.resolvedDueDate);
  return { plan, dates };
}

/** "Plan it": the Adherence Planner turns one task into small, scheduled steps. */
export default function PlanScreen() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  // `replan=1`: a fresh plan for what's left, keeping the steps already finished. `oath=1`: the
  // Citizenship Application's Oath, whose wait is the application being processed.
  const { id, replan, oath } = useLocalSearchParams<{ id: string; replan?: string; oath?: string }>();
  const { tasks, today, status, merge } = useTasks();
  const { session } = useAuth();
  const freeAgain = session ? relativeDayLabel(localDateString(planWindow(session.user.created_at).end), today) : '';
  const { settings } = useUserSettings();
  const task = tasks.find((t) => t.id === id);
  const style = settings?.preferences.style;
  const isReplan = replan === '1';
  const steps = tasks.filter((t) => t.parentId === id && !t.deletedAt);
  const finished = steps.filter((t) => t.completedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  // The planner's prompt is eval-gated, so finished work goes in as context, like a clarifying answer.
  const replanOptions = finished.length
    ? { questions: [copy.alreadyDone], answers: [finished.map((t) => t.title).join('; ')], style }
    : { style };

  const [phase, setPhase] = useState<Phase>({ kind: isReplan ? 'building' : 'reading' });
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Plans cost money: run once per attempt even if React runs the effect twice.
  const ranAttempt = useRef(-1);

  const start = useEffectEvent((t: Task) => {
    if (isReplan) {
      buildPlan(t, today, replanOptions).then(
        (built) => setPhase({ kind: 'preview', ...built }),
        (e) => setPhase({ kind: 'failed', ...failure(e, freeAgain) }),
      );
      return;
    }
    clarifyingQuestions(t, today)
      .then(async (asked) => {
        if (asked.length) {
          setQuestions(asked);
          setAnswers(asked.map(() => ''));
          setPhase({ kind: 'questions' });
          return;
        }
        setPhase({ kind: 'building' });
        setPhase({ kind: 'preview', ...(await buildPlan(t, today, { style })) });
      })
      .catch((e) => setPhase({ kind: 'failed', ...failure(e, freeAgain) }));
  });
  useEffect(() => {
    if (!task || ranAttempt.current === attempt) return;
    ranAttempt.current = attempt;
    start(task);
  }, [task, attempt]);

  const build = async (withAnswers: boolean) => {
    if (!task) return;
    setSaveError(null);
    setPhase({ kind: 'building' });
    try {
      const options = isReplan ? replanOptions : withAnswers ? { questions, answers, style } : { style };
      setPhase({ kind: 'preview', ...(await buildPlan(task, today, options)) });
    } catch (e) {
      setPhase({ kind: 'failed', ...failure(e, freeAgain) });
    }
  };

  const retry = () => {
    if (questions.length) return build(true);
    setPhase({ kind: isReplan ? 'building' : 'reading' });
    setAttempt((n) => n + 1);
  };

  const accept = async (plan: Plan, dates: LocalDate[]) => {
    if (!task) return;
    setSaveError(null);
    setPhase({ kind: 'saving', plan, dates });
    try {
      const open = steps.filter((t) => !t.completedAt);
      const after = Math.max(0, ...finished.map((t) => t.sortOrder));
      merge(await savePlan(task, plan, dates, isReplan ? { replaces: open, after } : undefined));
      close();
    } catch {
      setPhase({ kind: 'preview', plan, dates });
      setSaveError(copy.saveFailed);
    }
  };

  const waiting = (label: string, hint?: string) => (
    <View style={s.waiting} accessibilityLiveRegion="polite">
      <ActivityIndicator color={c.primary} />
      <Text variant="lead">{label}</Text>
      {hint ? (
        <Text variant="meta" color={c.muted}>
          {hint}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <View style={s.column}>
        <View style={s.topBar}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={copy.close} style={s.closeButton}>
            <Icon name="close" color={c.ink} />
          </Pressable>
          <Text variant="label" color={c.muted}>
            {actions.planIt.toUpperCase()}
          </Text>
        </View>

        {!task ? (
          status === 'ready' ? (
            <Text variant="lead" color={c.inkSoft}>
              {copy.notFound}
            </Text>
          ) : (
            waiting(copy.reading)
          )
        ) : (
          <>
            <Text variant="pageTitle" accessibilityRole="header">
              {task.title}
            </Text>

            {phase.kind === 'reading' ? waiting(copy.reading) : null}
            {phase.kind === 'building' ? (oath === '1' ? waiting(copy.processing, copy.processingHint) : waiting(copy.building, copy.buildingHint)) : null}

            {phase.kind === 'questions' ? (
              <View style={s.questions}>
                <Text variant="body" color={c.inkSoft}>
                  {copy.questionsLead}
                </Text>
                {questions.map((q, i) => (
                  <View key={q} style={s.question}>
                    <Text variant="item">{q}</Text>
                    <TextInput
                      value={answers[i]}
                      onChangeText={(v) => setAnswers((prev) => prev.map((a, j) => (j === i ? v : a)))}
                      placeholder={copy.answerPlaceholder}
                      placeholderTextColor={c.muted}
                      accessibilityLabel={q}
                      style={s.input}
                    />
                  </View>
                ))}
                <Button label={copy.build} onPress={() => build(true)} />
                <Button variant="quiet" label={copy.skip} onPress={() => build(false)} />
              </View>
            ) : null}

            {phase.kind === 'preview' || phase.kind === 'saving' ? (
              <View style={s.preview}>
                {isReplan ? (
                  <Text variant="meta" color={c.primaryText}>
                    {copy.replanLead(finished.length)}
                  </Text>
                ) : null}
                <Text variant="lead" color={c.inkSoft}>
                  {phase.plan.analysis}
                </Text>
                <View style={s.summary}>
                  <Text variant="label" color={c.primaryText} style={s.summaryText}>
                    {copy.summary(phase.plan.steps.length, phase.plan.totalEstimatedTime).toUpperCase()}
                  </Text>
                  {task.dueOn ?? phase.plan.resolvedDueDate ? (
                    <Text variant="label" color={c.muted} style={s.summaryText}>
                      {copy.dueBy(relativeDayLabel((task.dueOn ?? phase.plan.resolvedDueDate)!, today)).toUpperCase()}
                    </Text>
                  ) : null}
                </View>

                <View style={s.steps}>
                  {phase.plan.steps.map((step, i) => (
                    <View key={step.id} style={[s.step, i > 0 && s.stepRule]}>
                      <Text variant="label" color={c.muted} style={s.stepNumber}>
                        {String(i + 1).padStart(2, '0')}
                      </Text>
                      <View style={s.stepBody}>
                        <Text variant="item">{step.title}</Text>
                        {step.description ? (
                          <Text variant="meta" color={c.inkSoft}>
                            {step.description}
                          </Text>
                        ) : null}
                        <View style={s.stepMeta}>
                          <Text variant="labelSmall" color={c.muted} style={s.chip}>
                            {step.estimatedTime}
                          </Text>
                          {phase.dates[i] ? (
                            <Text variant="labelSmall" color={c.primaryText} style={s.chip}>
                              {relativeDayLabel(phase.dates[i], today)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={s.tag}>
                  <Icon name="shrink" size={13} color={c.primaryText} strokeWidth={2} />
                  <Text variant="meta" color={c.primaryText}>
                    {voice.madeSmaller}
                  </Text>
                </View>

                {saveError ? (
                  <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
                    {saveError}
                  </Text>
                ) : null}
                <Button
                  label={phase.kind === 'saving' ? copy.saving : copy.use}
                  disabled={phase.kind === 'saving'}
                  onPress={() => accept(phase.plan, phase.dates)}
                />
                <Button
                  variant="secondary"
                  label={copy.tryAgain}
                  disabled={phase.kind === 'saving'}
                  onPress={() => build(questions.length > 0)}
                />
              </View>
            ) : null}

            {phase.kind === 'failed' ? (
              <View style={s.failed}>
                <Text variant="body" color={c.inkSoft} accessibilityLiveRegion="polite">
                  {phase.message}
                </Text>
                {phase.canRetry ? <Button variant="secondary" label={copy.tryAgain} onPress={retry} /> : null}
                <Button variant="quiet" label={copy.close} onPress={close} />
              </View>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    column: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 14 },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: -12 },
    closeButton: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    waiting: { alignItems: 'center', gap: 10, paddingVertical: 48 },
    questions: { gap: 14 },
    question: { gap: 6 },
    input: {
      minHeight: 48,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
      color: t.c.ink,
      fontFamily: t.fonts.body,
      fontSize: 16,
    },
    preview: { gap: 12 },
    summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    summaryText: { letterSpacing: 0.8 },
    steps: {
      backgroundColor: t.c.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      borderRadius: t.radii.card,
      paddingHorizontal: 16,
    },
    step: { flexDirection: 'row', gap: 12, paddingVertical: 14 },
    stepRule: { borderTopWidth: 1, borderTopColor: t.c.rule },
    stepNumber: { paddingTop: 2, letterSpacing: 0 },
    stepBody: { flex: 1, gap: 4 },
    stepMeta: { flexDirection: 'row', gap: 6, marginTop: 2 },
    chip: {
      letterSpacing: 0,
      backgroundColor: t.c.chip,
      borderRadius: t.radii.chip,
      paddingHorizontal: 6,
      paddingVertical: 1,
      overflow: 'hidden',
    },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    failed: { gap: 10, alignItems: 'flex-start', paddingVertical: 12 },
  }),
});
