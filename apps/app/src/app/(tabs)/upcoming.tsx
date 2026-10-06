import {
  addDays,
  buildUpcoming,
  formatShortDate,
  upcomingCounts,
  upcomingDayLabel,
  upcomingSectionFor,
  voice,
  type LocalDate,
  type Task,
} from '@pn/core';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { useCapture } from '@/components/capture';
import { Icon } from '@/components/icon';
import { MonthCalendar } from '@/components/month-calendar';
import { NoticeBar } from '@/components/notice-bar';
import { RowMenu } from '@/components/row-menu';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { DaySection } from '@/components/upcoming/day-section';
import { WeekStrip } from '@/components/upcoming/week-strip';
import { useLists } from '@/data/lists-store';
import { noteTitles } from '@/data/note-titles';
import { useNotes } from '@/data/notes-store';
import { useTasks } from '@/data/tasks-store';
import { useCheckOff } from '@/hooks/use-check-off';
import { useIsWide } from '@/hooks/use-is-wide';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.upcoming;
/** Breathing room above a day scrolled to the top. */
const SCROLL_MARGIN = 8;

export default function UpcomingScreen() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const wide = useIsWide();
  const { tasks, status, today, error, refresh } = useTasks();
  const { open: capture } = useCapture();
  const { lists } = useLists();
  const { notes } = useNotes();
  const [menuFor, setMenuFor] = useState<Task | null>(null);
  const [selected, setSelected] = useState<LocalDate | null>(null);
  const [monthOpen, setMonthOpen] = useState(false);

  const view = useMemo(() => buildUpcoming(tasks, today), [tasks, today]);
  const marks = useMemo(() => upcomingCounts(view), [view]);
  const byId = useMemo(() => new Map<string, Task>(tasks.map((t) => [t.id, t])), [tasks]);
  const planned = useMemo(() => new Set(tasks.flatMap((t) => (t.parentId ? [t.parentId] : []))), [tasks]);

  // Where each day sits in the list, for scrolling to a day picked on the calendar.
  const scrollRef = useRef<ScrollView>(null);
  const listY = useRef(0);
  const sectionY = useRef<Record<string, number>>({});
  const pinnedHeight = useRef(0);
  // On phones the week strip stays pinned while the list scrolls; the open month scrolls away.
  const pinned = !wide && !monthOpen;

  const select = (day: LocalDate) => {
    setSelected(day);
    const y = listY.current + (sectionY.current[upcomingSectionFor(view, day)] ?? 0);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - (pinned ? pinnedHeight.current : 0) - SCROLL_MARGIN), animated: true });
  };

  const onPlan = (id: string) => router.push({ pathname: '/plan/[id]', params: { id } });
  const onOpen = (id: string) => router.push({ pathname: '/task/[id]', params: { id } });
  const onMenu = (id: string) => setMenuFor(byId.get(id) ?? null);
  const onToggle = useCheckOff();

  const places = useMemo(
    () => new Map([...lists.map((l) => [l.id, l.name] as const), ...noteTitles(notes, tasks)]),
    [lists, notes, tasks],
  );
  const rows = { today, planned, places, onToggle, onPlan, onMenu, onOpen };
  const month = <MonthCalendar selected={selected} today={today} onSelect={select} marks={marks} />;

  return (
    <Screen
      scrollRef={scrollRef}
      stickyHeaderIndices={wide ? undefined : pinned ? [1] : []}
      aside={<View style={[s.card, s.asideCard]}>{month}</View>}>
      <View style={s.head}>
        <Text variant="label" color={c.muted}>
          {copy.eyebrow.toUpperCase()}
        </Text>
        <Text variant="pageTitle" accessibilityRole="header">
          {copy.title}
        </Text>
      </View>

      {wide ? null : (
        <View style={s.pinned} onLayout={(e) => (pinnedHeight.current = e.nativeEvent.layout.height)}>
          <View style={s.card}>
            {monthOpen ? (
              month
            ) : (
              <WeekStrip start={selected ?? addDays(today, 1)} today={today} selected={selected} marks={marks} onSelect={select} />
            )}
            <Pressable
              onPress={() => setMonthOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: monthOpen }}
              style={({ pressed }) => [s.toggle, pressed && s.pressed]}>
              <Text variant="button" color={c.primaryText}>
                {monthOpen ? copy.week : copy.month}
              </Text>
              <View style={monthOpen ? s.chevronUp : s.chevronDown}>
                <Icon name="chevronRight" size={14} color={c.primaryText} strokeWidth={2} />
              </View>
            </Pressable>
          </View>
        </View>
      )}

      <View style={s.list} onLayout={(e) => (listY.current = e.nativeEvent.layout.y)}>
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
              <DaySection
                key={day.date}
                label={upcomingDayLabel(day.date, today)}
                entries={day.entries}
                selected={day.date === selected}
                onLayout={(e) => (sectionY.current[day.date] = e.nativeEvent.layout.y)}
                onAdd={() => capture({ day: day.date })}
                addLabel={copy.addTo(formatShortDate(day.date))}
                {...rows}
              />
            ))}
            {view.later.length > 0 ? (
              <DaySection
                label={copy.later}
                entries={view.later}
                withDates
                onLayout={(e) => (sectionY.current.later = e.nativeEvent.layout.y)}
                {...rows}
              />
            ) : null}
          </>
        ) : null}
      </View>

      <RowMenu task={menuFor} onClose={() => setMenuFor(null)} />
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    head: { gap: 6 },
    // Opaque, so rows scroll out of sight beneath the pinned strip.
    pinned: { backgroundColor: t.c.bg, paddingVertical: 4 },
    card: {
      paddingHorizontal: 6,
      paddingTop: 2,
      borderRadius: t.radii.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      backgroundColor: t.c.card,
    },
    asideCard: { paddingBottom: 6 },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      minHeight: t.hitTarget,
    },
    chevronDown: { transform: [{ rotate: '90deg' }] },
    chevronUp: { transform: [{ rotate: '-90deg' }] },
    list: { gap: 14 },
    loading: { marginTop: 24 },
    failed: { gap: 10, alignItems: 'flex-start' },
    pressed: { opacity: 0.7 },
  }),
});
