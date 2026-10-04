import {
  buildToday,
  formatDayLabel,
  formatTime,
  names,
  parseLocalDate,
  relativeDayPhrase,
  voice,
  type AgendaEntry,
  type Task,
} from '@pn/core';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { personName } from '@/auth/person-name';
import { Button } from '@/components/button';
import { useCapture } from '@/components/capture';
import { Icon } from '@/components/icon';
import { NextStepCard } from '@/components/next-step-card';
import { Screen } from '@/components/screen';
import { TaskRow, type TaskRowItem } from '@/components/task-row';
import { Text } from '@/components/text';
import { useTasks } from '@/data/tasks-store';
import { useStyles, type Tokens } from '@/theme/tokens';

/** "due today" / "due Fri" */
const dueLabel = (dueOn: string, today: string) => voice.today.due(relativeDayPhrase(dueOn, today));

function rowFor(entry: AgendaEntry, today: string): TaskRowItem {
  const t = entry.task;
  const meta: string[] = [];
  if (entry.parentTitle) meta.push(`${entry.parentTitle} · step ${entry.stepIndex} of ${entry.stepCount}`);
  else if (t.dueOn) meta.push(dueLabel(t.dueOn, today));
  if (entry.done && t.completedAt) meta.push(formatTime(new Date(t.completedAt)));
  const clock = t.remindAt ?? t.dueAt;
  return {
    id: t.id,
    title: t.title,
    meta: meta.join(' · ') || undefined,
    rrule: t.rrule ?? undefined,
    minutes: t.estimateMinutes ?? undefined,
    time: clock && !entry.done ? formatTime(new Date(clock)) : undefined,
    done: entry.done,
  };
}

export default function TodayScreen() {
  const s = useStyles(makeStyles);
  const { c, fonts } = s.t;
  const { session } = useAuth();
  const { tasks, status, today, rolloverHour, error, notice, refresh, toggle } = useTasks();
  const { open: capture } = useCapture();
  const [customsOpen, setCustomsOpen] = useState(false);

  const view = buildToday(tasks, today, rolloverHour);
  const byId = new Map<string, Task>(tasks.map((t) => [t.id, t]));
  const onToggle = (id: string) => {
    const task = byId.get(id);
    if (task) toggle(task);
  };

  const firstName = personName(session?.user).first;
  const next = view.nextStep;
  const openCount = view.agenda.filter((e) => !e.done).length + (next ? 1 : 0);
  const nextParent = next?.task.parentId ? byId.get(next.task.parentId) : undefined;

  return (
    <Screen>
      <View style={s.date}>
        <Icon name="sun" size={15} color={c.accent} strokeWidth={1.8} />
        <Text variant="label" color={c.muted} style={s.dateText}>
          {formatDayLabel(parseLocalDate(today))}
        </Text>
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
            {voice.todaySubtitle(openCount)}
          </Text>
        ) : null}
      </View>

      {error ? (
        <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {status === 'loading' && tasks.length === 0 ? <ActivityIndicator color={c.primary} style={s.loading} /> : null}

      {status === 'error' ? (
        <View style={s.failed}>
          <Text variant="body" color={c.inkSoft}>
            {voice.today.loadFailed}
          </Text>
          <Button variant="secondary" label={voice.today.retry} onPress={refresh} />
        </View>
      ) : null}

      {view.customs.length > 0 ? (
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
                  item={rowFor({ task: t, done: false }, today)}
                  last={i === view.customs.length - 1}
                  onToggle={onToggle}
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
            nextParent?.dueOn ? dueLabel(nextParent.dueOn, today) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          index={next.stepIndex ?? 1}
          total={next.stepCount ?? 1}
          aiBuilt={next.task.source === 'ai'}
        />
      ) : null}

      {status === 'ready' ? (
        <>
          <View style={s.agendaHead}>
            <Text variant="section" accessibilityRole="header">
              Today&apos;s agenda
            </Text>
            <View style={s.count}>
              <Text variant="label" color={c.muted} style={s.countText}>
                {view.agenda.length}
              </Text>
            </View>
          </View>

          {notice ? (
            <Text variant="meta" color={c.primaryText} accessibilityLiveRegion="polite">
              {notice}
            </Text>
          ) : null}

          {view.agenda.length === 0 && !next ? (
            <View style={s.empty}>
              <Text variant="body" color={c.inkSoft}>
                {voice.today.emptyHint}
              </Text>
              <Button variant="secondary" icon={<Icon name="plus" size={18} color={c.ink} />} label={voice.today.captureCta} onPress={capture} />
            </View>
          ) : (
            <View style={s.list}>
              {view.agenda.map((entry, i) => (
                <TaskRow key={entry.task.id} item={rowFor(entry, today)} last={i === view.agenda.length - 1} onToggle={onToggle} />
              ))}
            </View>
          )}
        </>
      ) : null}
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
