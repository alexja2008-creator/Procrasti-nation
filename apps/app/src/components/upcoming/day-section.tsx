import {
  formatShortDate,
  formatTime,
  relativeDayPhrase,
  suggestsPlan,
  voice,
  type LocalDate,
  type UpcomingEntry,
} from '@pn/core';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Icon } from '@/components/icon';
import { TaskRow, type TaskRowItem } from '@/components/task-row';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.upcoming;

/** `withDate`: rows in Later say which day they're on. */
function rowFor(entry: UpcomingEntry, today: LocalDate, planned: Set<string>, withDate: boolean): TaskRowItem {
  const t = entry.task;
  const meta: string[] = [];
  if (entry.parentTitle) meta.push(`${entry.parentTitle} · step ${entry.stepIndex} of ${entry.stepCount}`);
  if (withDate) {
    if (t.scheduledOn) meta.push(formatShortDate(entry.date));
    if (t.dueOn && !entry.parentTitle) meta.push(voice.today.due(formatShortDate(t.dueOn)));
  } else if (t.dueOn && !entry.parentTitle) {
    meta.push(voice.today.due(relativeDayPhrase(t.dueOn, today)));
  }
  return {
    id: t.id,
    title: t.title,
    meta: meta.join(' · ') || undefined,
    rrule: t.rrule ?? undefined,
    minutes: t.estimateMinutes ?? undefined,
    time: entry.at ? formatTime(new Date(entry.at)) : undefined,
    suggestPlan: !t.parentId && t.source !== 'ai' && !planned.has(t.id) && suggestsPlan(t.title),
  };
}

type Props = {
  /** "Tomorrow · Wed 7 Oct", "Later". */
  label: string;
  entries: UpcomingEntry[];
  today: LocalDate;
  /** Ids of tasks that already have plan steps. */
  planned: Set<string>;
  withDates?: boolean;
  /** The day picked on the calendar. */
  selected?: boolean;
  onToggle: (id: string) => void;
  onPlan: (id: string) => void;
  onMenu: (id: string) => void;
  onOpen: (id: string) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  /** The heading's "+": quick add into this day. `addLabel` is read aloud. */
  onAdd?: () => void;
  addLabel?: string;
};

/** One day in Upcoming: its heading, then to-dos and deadline markers (or "Nothing yet."). */
export function DaySection({ label, entries, today, planned, withDates = false, selected = false, onToggle, onPlan, onMenu, onOpen, onLayout, onAdd, addLabel }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <View onLayout={onLayout}>
      <View style={s.head}>
        <Text variant="label" color={selected ? c.primaryText : c.inkSoft} accessibilityRole="header" style={s.label}>
          {label.toUpperCase()}
        </Text>
        {onAdd ? (
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={addLabel}
            hitSlop={4}
            style={({ pressed }) => [s.add, pressed && s.pressed]}>
            <Icon name="plus" size={18} color={c.primaryText} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      {entries.length === 0 ? (
        <Text variant="meta" color={c.muted} style={s.empty}>
          {copy.nothingYet}
        </Text>
      ) : (
        entries.map((entry, i) =>
          entry.kind === 'deadline' ? (
            <DeadlineRow
              key={`due-${entry.task.id}`}
              entry={entry}
              withDate={withDates}
              last={i === entries.length - 1}
              onOpen={onOpen}
            />
          ) : (
            <TaskRow
              key={entry.task.id}
              item={rowFor(entry, today, planned, withDates)}
              last={i === entries.length - 1}
              onToggle={onToggle}
              onPlan={onPlan}
              onMenu={onMenu}
              onOpen={onOpen}
            />
          ),
        )
      )}
    </View>
  );
}

/** The day a task is due, when its work happens on other days. Not a to-do: no checkbox. */
function DeadlineRow({ entry, withDate, last, onOpen }: { entry: UpcomingEntry; withDate: boolean; last: boolean; onOpen: (id: string) => void }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const day = formatShortDate(entry.date);
  return (
    <Pressable
      onPress={() => onOpen(entry.task.id)}
      accessibilityRole="button"
      accessibilityLabel={copy.dueSpoken(entry.task.title, day)}
      style={({ pressed }) => [s.deadline, !last && s.rule, pressed && s.pressed]}>
      <View style={s.dueMark}>
        <Text variant="labelSmall" color={c.stamp.terracotta} style={s.dueText}>
          {copy.due.toUpperCase()}
        </Text>
      </View>
      <View style={s.main}>
        <Text variant="item">{entry.task.title}</Text>
        {withDate || entry.at ? (
          <Text variant="meta" color={c.muted}>
            {[withDate ? day : null, entry.at ? formatTime(new Date(entry.at)) : null].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 36,
      borderBottomWidth: 1,
      borderBottomColor: t.c.rule,
    },
    label: { flex: 1 },
    add: { width: 36, height: 36, marginRight: -6, alignItems: 'center', justifyContent: 'center' },
    empty: { paddingVertical: 12, paddingLeft: t.hitTarget + 6 },
    deadline: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: t.hitTarget + 10, paddingVertical: 5 },
    rule: { borderBottomWidth: 1, borderBottomColor: t.c.rule },
    // Sits in the checkbox column, so titles line up with the to-dos.
    dueMark: { width: t.hitTarget, alignItems: 'center' },
    dueText: {
      letterSpacing: 1,
      borderWidth: 1.5,
      borderColor: t.c.stamp.terracotta,
      borderRadius: t.radii.chip,
      paddingHorizontal: 4,
      paddingVertical: 1,
      overflow: 'hidden',
    },
    main: { flex: 1, gap: 2 },
    pressed: { opacity: 0.7 },
  }),
});
