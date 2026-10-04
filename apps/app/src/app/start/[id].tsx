import {
  defaultStartMinutes,
  formatClock,
  leftOutcome,
  relativeDayPhrase,
  stampKinds,
  stepContext,
  STUCK_MINUTES,
  voice,
  type StartSession,
  type StuckReason,
  type Task,
} from '@pn/core';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { SecurityLines } from '@/components/security-lines';
import { Breather } from '@/components/start/breather';
import { Stamped } from '@/components/start/stamped';
import { StuckPanel } from '@/components/start/stuck-panel';
import { TimerRing } from '@/components/start/timer-ring';
import { Text } from '@/components/text';
import { awardFirstStart, awardStamp } from '@/data/stamps';
import { sessionWriter } from '@/data/starts';
import { useTasks } from '@/data/tasks-store';
import { tinyFirstAction } from '@/data/unstick';
import { useUserSettings } from '@/data/user-settings';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useStartTimer } from '@/hooks/use-start-timer';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.start;
const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
const haptic = (style: Haptics.ImpactFeedbackStyle) => Platform.OS !== 'web' && Haptics.impactAsync(style);

export default function StartRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // A fresh session and clock for every task, including "Start the next step".
  return <StartMode key={id} id={id} />;
}

type Phase = 'running' | 'stuck' | 'breather' | 'stamped';

/** Start Mode: one step, a timer and the "just five minutes" contract. Every visit is a Start. */
function StartMode({ id }: { id: string }) {
  // Keep the screen on. Browsers may refuse the wake lock (hidden tab, permissions), so both calls swallow errors.
  useEffect(() => {
    const tag = `start-${id}`;
    activateKeepAwakeAsync(tag).catch(() => undefined);
    return () => {
      deactivateKeepAwake(tag).catch(() => undefined);
    };
  }, [id]);
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { tasks, status, today, toggle, notify } = useTasks();
  const { settings } = useUserSettings();
  const timer = useStartTimer();

  const live = tasks.find((t) => t.id === id && !t.deletedAt);
  // Done changes the store's copy (a repeating task even moves on); the stamped view keeps this one.
  const [finished, setFinished] = useState<Task | null>(null);
  const task = finished ?? live;
  const step = task ? stepContext(tasks, task) : null;

  const [phase, setPhase] = useState<Phase>('running');
  const [planned, setPlanned] = useState(() => defaultStartMinutes(settings?.preferences));
  const [keptGoing, setKeptGoing] = useState(false);
  const [tiny, setTiny] = useState<string | null>(null);
  const [firstStart, setFirstStart] = useState(false);

  const [save] = useState(sessionWriter);
  const current = useRef<StartSession | null>(null);

  const begin = (taskId: string, minutes: number) => {
    const row: StartSession = {
      id: Crypto.randomUUID(),
      userId,
      taskId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      plannedMinutes: minutes,
      outcome: null,
    };
    current.current = row;
    save(row);
    timer.restart();
  };

  const end = (outcome: NonNullable<StartSession['outcome']>) => {
    const row = current.current;
    if (!row || row.endedAt) return;
    current.current = { ...row, endedAt: new Date().toISOString(), outcome };
    save(current.current);
  };

  // Opening Start Mode is the Start. Waits for the task when the page was opened by URL.
  const onFirstSight = useEffectEvent((taskId: string) => {
    if (current.current) return;
    begin(taskId, planned);
    awardFirstStart(userId).then(setFirstStart, () => undefined);
  });
  useEffect(() => {
    if (live) onFirstSight(live.id);
  }, [live]);

  /** Ends the session as "stopped" or "kept going", by the clock of the session being left. */
  const endEarly = () => {
    const row = current.current;
    if (row) end(leftOutcome(timer.elapsedNow(), row.plannedMinutes));
  };

  // Leaving another way (browser back, a gesture) still ends the session. Deferred
  // and checked against a ref, so a development double-mount doesn't end it on the spot.
  const mounted = useRef(false);
  const onUnmount = useEffectEvent(endEarly);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setTimeout(() => {
        if (!mounted.current) onUnmount();
      }, 0);
    };
  }, []);

  const plannedMs = planned * 60_000;
  const reached = timer.elapsed >= plannedMs;
  const contract = phase === 'running' && reached && !keptGoing;

  const onContract = useEffectEvent(() => haptic(Haptics.ImpactFeedbackStyle.Medium));
  useEffect(() => {
    if (contract) onContract();
  }, [contract]);

  const leave = () => {
    endEarly();
    notify(copy.leftNotice);
    close();
  };

  const finish = () => {
    if (!task) return;
    end('done');
    if (!task.completedAt) toggle(task);
    awardStamp({ userId, kind: stampKinds.stepDone, taskId: task.id, listId: task.listId }).catch(() => undefined);
    setFinished(task);
    setPhase('stamped');
  };

  const togglePause = () => (timer.paused ? timer.resume() : timer.pause());
  const openStuck = () => {
    timer.pause();
    setPhase('stuck');
  };
  const backToIt = () => {
    timer.resume();
    setPhase('running');
  };
  const startTiny = (action: string) => {
    if (!task) return;
    end('stuck');
    setTiny(action);
    setPlanned(STUCK_MINUTES);
    setKeptGoing(false);
    begin(task.id, STUCK_MINUTES);
    setPhase('running');
  };
  const shrink = (reason: StuckReason, avoid: string[]) =>
    task
      ? tinyFirstAction(task, { parentTitle: step?.parent?.title, reason, style: settings?.preferences.style, avoid })
      : Promise.reject(new Error('task is gone'));

  useShortcuts(
    phase === 'running'
      ? { Space: togglePause, Escape: leave }
      : phase === 'stamped'
        ? { Escape: close }
        : { Escape: backToIt },
  );

  const eyebrow = step
    ? copy.step(step.parent?.title ?? '', step.index, step.count)
    : task?.dueOn
      ? voice.today.due(relativeDayPhrase(task.dueOn, today))
      : null;

  const ring = reached
    ? { progress: 1, clock: formatClock(timer.elapsed), caption: copy.andCounting }
    : {
        progress: timer.elapsed / plannedMs,
        clock: formatClock(plannedMs - timer.elapsed, 'up'),
        caption: timer.paused ? copy.paused : copy.of(formatClock(plannedMs)),
      };

  let body: ReactNode;
  if (!task) {
    body =
      status === 'ready' ? (
        <View style={s.missing}>
          <Text variant="lead" color={c.inkSoft}>
            {copy.notFound}
          </Text>
          <Button variant="secondary" label={copy.backToToday} onPress={close} />
        </View>
      ) : (
        <ActivityIndicator color={c.primary} style={s.loading} />
      );
  } else if (phase === 'stamped') {
    const next = step?.next;
    body = (
      <Stamped
        nextTitle={next?.title}
        onStartNext={next ? () => router.replace({ pathname: '/start/[id]', params: { id: next.id } }) : undefined}
        onBack={close}
      />
    );
  } else {
    body = (
      <>
        {eyebrow ? (
          // Terracotta marks the plan a step belongs to; a date stays muted (missed is never an alarm).
          <Text variant="label" color={step ? c.stamp.terracotta : c.muted} style={s.centered}>
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}
        <Text variant="pageTitle" accessibilityRole="header" style={[s.centered, s.title]}>
          {task.title}
        </Text>
        {task.notes && !tiny ? (
          <Text variant="body" color={c.inkSoft} style={s.centered}>
            {task.notes}
          </Text>
        ) : null}
        {firstStart ? (
          <Text variant="meta" color={c.primaryText} style={s.centered} accessibilityLiveRegion="polite">
            {copy.firstStart}
          </Text>
        ) : null}
        {tiny && phase === 'running' ? (
          <View style={s.tiny}>
            <Text variant="label" color={c.primaryText}>
              {copy.justThis.toUpperCase()}
            </Text>
            <Text variant="step">{tiny}</Text>
          </View>
        ) : null}

        {phase === 'stuck' ? (
          <StuckPanel shrink={shrink} onAccept={startTiny} onBreather={() => setPhase('breather')} onBack={backToIt} />
        ) : phase === 'breather' ? (
          <Breather onDone={backToIt} />
        ) : (
          <>
            <TimerRing
              {...ring}
              accessibilityLabel={`${ring.clock} ${ring.caption}`}
            />
            {contract ? (
              <View style={s.contract} accessibilityLiveRegion="polite">
                <Text variant="section" style={s.centered}>
                  {copy.contractTitle(planned)}
                </Text>
                <Text variant="body" color={c.inkSoft} style={s.centered}>
                  {copy.contractBody}
                </Text>
              </View>
            ) : (
              <Text variant="lead" color={c.inkSoft} style={s.centered}>
                {copy.lead(planned)}
              </Text>
            )}
            <View style={s.actions}>
              <Pressable
                onPress={finish}
                accessibilityRole="button"
                style={({ pressed }) => [s.done, pressed && s.pressed]}>
                <Text variant="step" color={c.onPrimary} style={s.doneText}>
                  {copy.done}
                </Text>
              </Pressable>
              <View style={s.row}>
                <View style={s.half}>
                  {contract ? (
                    <Button variant="secondary" label={copy.keepGoing} onPress={() => setKeptGoing(true)} />
                  ) : (
                    <Button variant="secondary" label={copy.stuck} onPress={openStuck} />
                  )}
                </View>
                <View style={s.half}>
                  {contract ? (
                    <Button variant="secondary" label={copy.stopHere} onPress={leave} />
                  ) : (
                    <Button
                      variant="secondary"
                      icon={<Icon name={timer.paused ? 'play' : 'pause'} size={16} color={c.ink} strokeWidth={2} />}
                      label={timer.paused ? copy.resume : copy.pause}
                      onPress={togglePause}
                    />
                  )}
                </View>
              </View>
            </View>
          </>
        )}
      </>
    );
  }

  return (
    <View style={s.fill}>
      <SecurityLines color={c.securityLine} />
      <ScrollView
        contentContainerStyle={[s.column, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        <View style={s.topBar}>
          <Pressable
            onPress={phase === 'stamped' || !task ? close : leave}
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            style={({ pressed }) => [s.closeButton, pressed && s.pressed]}>
            <Icon name="close" color={c.ink} />
          </Pressable>
          <Text variant="label" color={c.muted} style={s.topLabel}>
            {copy.eyebrow.toUpperCase()}
          </Text>
          <View style={s.closeButton} />
        </View>
        <View style={s.main}>{body}</View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    fill: { flex: 1, backgroundColor: t.c.bg },
    column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 14, flexGrow: 1 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    closeButton: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    topLabel: { letterSpacing: 1.8 },
    main: { flexGrow: 1, alignItems: 'center', gap: 18, paddingHorizontal: 12, paddingTop: 16 },
    centered: { textAlign: 'center' },
    title: { fontSize: 27, lineHeight: 33 },
    tiny: {
      alignSelf: 'stretch',
      gap: 6,
      padding: 16,
      borderWidth: 1,
      borderColor: t.c.next.border,
      borderRadius: t.radii.card,
      backgroundColor: t.c.next.bg,
    },
    contract: { gap: 6 },
    actions: { alignSelf: 'stretch', gap: 10 },
    done: {
      height: 56,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneText: { fontFamily: t.fonts.displayItalic, fontSize: 19, lineHeight: 24 },
    row: { flexDirection: 'row', gap: 10 },
    half: { flex: 1 },
    missing: { gap: 12, alignItems: 'center', paddingTop: 48 },
    loading: { marginTop: 64 },
    pressed: { opacity: 0.8 },
  }),
});
