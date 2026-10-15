import {
  buildToday,
  formatDayLabel,
  formatTime,
  groupAgenda,
  isDeclared,
  names,
  offersPlan,
  parseLocalDate,
  relativeDayPhrase,
  timeOnItsDay,
  voice,
  type AgendaEntry,
  type Task,
} from '@pn/core';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { personName } from '@/auth/person-name';
import { MorningBriefing } from '@/components/briefing/morning-briefing';
import { Button } from '@/components/button';
import { useCapture } from '@/components/capture';
import { Icon } from '@/components/icon';
import { NextStepCard } from '@/components/next-step-card';
import { NoticeBar } from '@/components/notice-bar';
import { PassportSaveCard } from '@/components/passport-save-card';
import { PlanRow } from '@/components/plan-row';
import { RowMenu } from '@/components/row-menu';
import { Screen } from '@/components/screen';
import { SearchButton } from '@/components/search-button';
import { TaskRow, type TaskRowItem } from '@/components/task-row';
import { Text } from '@/components/text';
import { useLists } from '@/data/lists-store';
import { noteTitles } from '@/data/note-titles';
import { useNotes } from '@/data/notes-store';
import { useTasks } from '@/data/tasks-store';
import { useUserSettings } from '@/data/user-settings';
import { useStyles, type Tokens } from '@/theme/tokens';

/** "due today" / "due Fri" */
const dueLabel = (dueOn: string, today: string) => voice.today.due(relativeDayPhrase(dueOn, today));

/**
 * `planned` holds ids of tasks that already have plan steps; `places` names
 * territories and notes by id (a checklist line names its note). `inPlan`: a
 * step listed under its plan's row, so its meta leaves the plan's name out.
 */
function rowFor(entry: AgendaEntry, today: string, planned: Set<string>, places: Map<string, string>, inPlan = false): TaskRowItem {
  const t = entry.task;
  const meta: string[] = [];
  if (entry.parentTitle) meta.push(inPlan ? `step ${entry.stepIndex} of ${entry.stepCount}` : `${entry.parentTitle} · step ${entry.stepIndex} of ${entry.stepCount}`);
  else {
    const place = t.noteId ? places.get(t.noteId) : t.listId ? places.get(t.listId) : undefined;
    if (place) meta.push(place);
    if (t.dueOn) meta.push(dueLabel(t.dueOn, today));
  }
  if (entry.done && t.completedAt) meta.push(formatTime(new Date(t.completedAt)));
  const clock = timeOnItsDay(t);
  return {
    id: t.id,
    title: t.title,
    meta: meta.join(' · ') || undefined,
    rrule: t.rrule ?? undefined,
    minutes: t.estimateMinutes ?? undefined,
    time: clock && !entry.done ? formatTime(new Date(clock)) : undefined,
    done: entry.done,
    suggestPlan: !entry.done && offersPlan(t, planned.has(t.id)),
    declared: !entry.done && isDeclared(t, today),
  };
}

export default function TodayScreen() {
  const s = useStyles(makeStyles);
  const { c, fonts } = s.t;
  const { session } = useAuth();
  const { tasks, status, today, rolloverHour, error, refresh, toggle } = useTasks();
  const { lists } = useLists();
  const { notes } = useNotes();
  const { open: capture } = useCapture();
  const [customsOpen, setCustomsOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<Task | null>(null);
  const { settings } = useUserSettings();
  // ?briefing=1: opened from the morning list notification.
  const { briefing } = useLocalSearchParams<{ briefing?: string }>();
  const [showAll, setShowAll] = useState(false);
  // "Show everything" lasts for this visit.
  useFocusEffect(useCallback(() => () => setShowAll(false), []));
  // Plans whose steps are showing (Show steps), for as long as Today is open.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const onExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const view = buildToday(tasks, today, rolloverHour);
  // Each plan is one item, its steps behind it; a plan counts once.
  const { items, openCount } = groupAgenda(view, tasks);
  const hasOpen = items.some((i) => (i.kind === 'task' ? !i.entry.done : !i.group.finished));
  const byId = new Map<string, Task>(tasks.map((t) => [t.id, t]));
  const planned = new Set(tasks.flatMap((t) => (t.parentId ? [t.parentId] : [])));
  const places = new Map([...lists.map((l) => [l.id, l.name] as const), ...noteTitles(notes, tasks)]);
  const onPlan = (id: string) => router.push({ pathname: '/plan/[id]', params: { id } });
  const onStart = (id: string) => router.push({ pathname: '/start/[id]', params: { id } });
  const onOpen = (id: string) => router.push({ pathname: '/task/[id]', params: { id } });
  const onToggle = (id: string) => {
    const task = byId.get(id);
    if (task) toggle(task);
  };
  const onMenu = (id: string) => {
    const task = byId.get(id);
    if (!task) return;
    setMenuFor(task);
  };

  const firstName = personName(session?.user).first;
  // One thing to Start: the next plan step, or else the most pressing task.
  const next = view.nextStep ?? view.upNext;
  const isStep = next === view.nextStep;
  const nextParent = next?.task.parentId ? byId.get(next.task.parentId) : undefined;
  const nextDueOn = isStep ? nextParent?.dueOn : next?.task.dueOn;
  // "It feels too big": just the next step, the rest a tap away.
  const focused = settings?.preferences.style === 'overwhelmed' && !!next && !showAll;
  const hidden = openCount - 1 + view.customs.length;

  return (
    <Screen>
      <View style={s.date}>
        <Icon name="sun" size={15} color={c.accent} strokeWidth={1.8} />
        <Text variant="label" color={c.muted} style={s.dateText}>
          {formatDayLabel(parseLocalDate(today))}
        </Text>
        <SearchButton />
      </View>

      <View style={s.greeting}>
        <Text variant="title" accessibilityRole="header">
          {firstName ? (
            <>
              {voice.greetingLead},{' '}
              <RNText style={{ fontFamily: fonts.displayItalic, color: c.primary }}>{firstName}.</RNText>
            </>
          ) : (
            voice.greeting(null)
          )}
        </Text>
        {status === 'ready' ? (
          <Text variant="lead" color={c.muted}>
            {focused ? voice.today.focusedSubtitle : voice.todaySubtitle(openCount)}
          </Text>
        ) : null}
      </View>

      {error ? (
        <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {/* Until the passport is saved: save it, or check the email its link went to. */}
      <PassportSaveCard />

      {status === 'loading' && tasks.length === 0 ? <ActivityIndicator color={c.primary} style={s.loading} /> : null}

      {status === 'error' ? (
        <View style={s.failed}>
          <Text variant="body" color={c.inkSoft}>
            {voice.today.loadFailed}
          </Text>
          <Button variant="secondary" label={voice.today.retry} onPress={refresh} />
        </View>
      ) : null}

      {/* What carried over from before today, each given a place again. */}
      {session ? (
        <MorningBriefing
          userId={session.user.id}
          openOnArrival={briefing === '1'}
          onArrived={() => router.setParams({ briefing: undefined })}
        />
      ) : null}

      {!focused && view.customs.length > 0 ? (
        <View>
          <Pressable
            onPress={() => setCustomsOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: customsOpen }}
            accessibilityLabel={voice.customsWaiting(view.customs.length)}
            style={({ pressed }) => [s.customs, pressed && s.pressed]}>
            <Icon name="inbox" size={19} color={c.ink} />
            <Text variant="body" style={s.customsText}>
              <RNText style={{ fontFamily: fonts.bodySemibold }}>{voice.things(view.customs.length)}</RNText>
              {` waiting at ${names.customs}`}
            </Text>
            <View style={customsOpen && s.chevronOpen}>
              <Icon name="chevronRight" size={16} color={c.ink} strokeWidth={1.8} />
            </View>
          </Pressable>
          {customsOpen ? (
            <View style={s.customsList}>
              {view.customs.map((t, i) => (
                <TaskRow
                  key={t.id}
                  item={rowFor({ task: t, done: false }, today, planned, places)}
                  last={i === view.customs.length - 1}
                  onToggle={onToggle}
                  onPlan={onPlan}
                  onMenu={onMenu}
                  onOpen={onOpen}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {next ? (
        <NextStepCard
          title={next.task.title}
          meta={[
            next.task.estimateMinutes ? `${next.task.estimateMinutes} min` : null,
            next.parentTitle,
            nextDueOn ? dueLabel(nextDueOn, today) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          label={isStep ? voice.nextStepLabel : voice.upNextLabel}
          position={isStep ? { index: next.stepIndex ?? 1, total: next.stepCount ?? 1 } : undefined}
          aiBuilt={next.task.source === 'ai'}
          onStart={() => onStart(next.task.id)}
          onOpen={() => onOpen(next.task.id)}
        />
      ) : null}

      {/* The agenda below carries it otherwise; focused, it would never show ("You started", Undo). */}
      {focused ? <NoticeBar /> : null}

      {focused && hidden > 0 ? (
        <Pressable
          onPress={() => setShowAll(true)}
          accessibilityRole="button"
          style={({ pressed }) => [s.showAll, pressed && s.pressed]}>
          <Text variant="button" color={c.primaryText}>
            {voice.today.showEverything(hidden)}
          </Text>
        </Pressable>
      ) : null}

      {status === 'ready' && !focused ? (
        <>
          <View style={s.agendaHead}>
            <Text variant="section" accessibilityRole="header">
              Today&apos;s agenda
            </Text>
            <View style={s.count}>
              <Text variant="label" color={c.muted} style={s.countText}>
                {items.length}
              </Text>
            </View>
          </View>

          <NoticeBar />

          {/* Always shown: press and hold is the way to Start or plan any task. */}
          {hasOpen ? (
            <Text variant="meta" color={c.muted} style={s.hint}>
              {voice.rowMenuHint(Platform.OS === 'web')}
            </Text>
          ) : null}

          {items.length === 0 && !next ? (
            <View style={s.empty}>
              <Text variant="body" color={c.inkSoft}>
                {voice.today.emptyHint}
              </Text>
              <Button variant="secondary" icon={<Icon name="plus" size={18} color={c.ink} />} label={voice.today.captureCta} onPress={() => capture()} />
            </View>
          ) : (
            <View style={s.list}>
              {items.map((item, i) =>
                item.kind === 'task' ? (
                  <TaskRow
                    key={item.entry.task.id}
                    item={rowFor(item.entry, today, planned, places)}
                    last={i === items.length - 1}
                    onToggle={onToggle}
                    onPlan={onPlan}
                    onMenu={onMenu}
                    onOpen={onOpen}
                  />
                ) : (
                  <PlanRow
                    key={item.group.plan.id}
                    group={item.group}
                    item={rowFor({ task: item.group.plan, done: item.group.finished }, today, planned, places)}
                    expanded={expanded.has(item.group.plan.id)}
                    onExpand={onExpand}
                    onFinish={onToggle}
                    onMenu={onMenu}
                    onOpen={onOpen}
                    last={i === items.length - 1}>
                    {item.group.steps.map((step, j) => (
                      <TaskRow
                        key={step.task.id}
                        item={rowFor(step, today, planned, places, true)}
                        last={j === item.group.steps.length - 1}
                        onToggle={onToggle}
                        onMenu={onMenu}
                        onOpen={onOpen}
                      />
                    ))}
                  </PlanRow>
                ),
              )}
            </View>
          )}
        </>
      ) : null}

      <RowMenu task={menuFor} onClose={() => setMenuFor(null)} />
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    date: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 26 },
    dateText: { fontSize: 12 },
    greeting: { gap: 6 },
    loading: { marginTop: 24 },
    showAll: { alignSelf: 'flex-start', minHeight: t.hitTarget, justifyContent: 'center' },
    failed: { gap: 10, alignItems: 'flex-start' },
    customs: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 46,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: t.c.dashed,
      borderRadius: t.radii.md,
    },
    customsText: { flex: 1 },
    chevronOpen: { transform: [{ rotate: '90deg' }] },
    customsList: { marginTop: 4 },
    agendaHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    count: { backgroundColor: t.c.chip, borderRadius: t.radii.sm, paddingHorizontal: 7, paddingVertical: 2 },
    countText: { letterSpacing: 0 },
    list: { marginTop: -6 },
    hint: { marginTop: -8 },
    empty: {
      gap: 12,
      padding: 16,
      borderRadius: t.radii.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      backgroundColor: t.c.card,
      alignItems: 'flex-start',
    },
    pressed: { opacity: 0.7 },
  }),
});
