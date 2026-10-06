import { buildUpcoming, upcomingDayLabel, voice, type Task } from '@pn/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NoticeBar } from '@/components/notice-bar';
import { RowMenu } from '@/components/row-menu';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { DaySection } from '@/components/upcoming/day-section';
import { useTasks } from '@/data/tasks-store';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.upcoming;

export default function UpcomingScreen() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, status, today, error, refresh, toggle, notify } = useTasks();
  const [menuFor, setMenuFor] = useState<Task | null>(null);

  const view = useMemo(() => buildUpcoming(tasks, today), [tasks, today]);
  const byId = useMemo(() => new Map<string, Task>(tasks.map((t) => [t.id, t])), [tasks]);
  const planned = useMemo(() => new Set(tasks.flatMap((t) => (t.parentId ? [t.parentId] : []))), [tasks]);

  const onPlan = (id: string) => router.push({ pathname: '/plan/[id]', params: { id } });
  const onStart = (id: string) => router.push({ pathname: '/start/[id]', params: { id } });
  const onOpen = (id: string) => router.push({ pathname: '/task/[id]', params: { id } });
  const onMenu = (id: string) => setMenuFor(byId.get(id) ?? null);
  const onToggle = (id: string) => {
    const task = byId.get(id);
    if (!task) return;
    toggle(task);
    // A finished item leaves Upcoming, so offer a way back. (Repeats say where they moved.)
    if (!task.rrule && !task.completedAt) {
      notify(copy.stamped(task.title), () => toggle({ ...task, status: 'completed', completedAt: new Date().toISOString() }));
    }
  };
  const canPlan = (t: Task) => !t.parentId && t.source !== 'ai' && !planned.has(t.id) && !t.completedAt;

  const rows = { today, planned, onToggle, onPlan, onMenu, onOpen };

  return (
    <Screen>
      <View style={s.head}>
        <Text variant="label" color={c.muted}>
          {copy.eyebrow.toUpperCase()}
        </Text>
        <Text variant="pageTitle" accessibilityRole="header">
          {copy.title}
        </Text>
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
            {copy.loadFailed}
          </Text>
          <Button variant="secondary" label={voice.today.retry} onPress={refresh} />
        </View>
      ) : null}

      {status === 'ready' ? (
        <>
          <NoticeBar />
          {view.days.map((day) => (
            <DaySection key={day.date} label={upcomingDayLabel(day.date, today)} entries={day.entries} {...rows} />
          ))}
          {view.later.length > 0 ? <DaySection label={copy.later} entries={view.later} withDates {...rows} /> : null}
        </>
      ) : null}

      <RowMenu
        task={menuFor}
        canPlan={!!menuFor && canPlan(menuFor)}
        onStart={(t) => onStart(t.id)}
        onPlan={(t) => onPlan(t.id)}
        onClose={() => setMenuFor(null)}
      />
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    head: { gap: 6 },
    loading: { marginTop: 24 },
    failed: { gap: 10, alignItems: 'flex-start' },
  }),
});
