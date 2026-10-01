import { formatDayLabel, names, voice } from '@pn/core';
import { useState } from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { Icon } from '@/components/icon';
import { NextStepCard } from '@/components/next-step-card';
import { Screen } from '@/components/screen';
import { TaskRow } from '@/components/task-row';
import { Text } from '@/components/text';
import { mockAgenda, mockCustomsCount, mockNextStep, mockProfile } from '@/data/mock';
import { useStyles, type Tokens } from '@/theme/tokens';

export default function TodayScreen() {
  const s = useStyles(makeStyles);
  const { c, fonts } = s.t;
  const [agenda, setAgenda] = useState(mockAgenda);

  const toggle = (id: string) =>
    setAgenda((items) => items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));

  const next = mockNextStep;

  return (
    <Screen>
      <View style={s.topRow}>
        <View style={s.date}>
          <Icon name="sun" size={15} color={c.accent} strokeWidth={1.8} />
          <Text variant="label" color={c.muted} style={s.dateText}>
            {formatDayLabel()}
          </Text>
        </View>
        <View style={s.residency}>
          <Text variant="label" color={c.primary} style={s.residencyText}>
            {names.residency.toUpperCase()} · DAY {mockProfile.residencyDays}
          </Text>
        </View>
      </View>

      <View style={s.greeting}>
        <Text variant="title" accessibilityRole="header">
          {voice.greetingLead},{' '}
          <RNText style={{ fontFamily: fonts.displayItalic, color: c.primary }}>{mockProfile.firstName}.</RNText>
        </Text>
        <Text variant="lead" color={c.muted}>
          {voice.todaySubtitle(agenda.length)}
        </Text>
      </View>

      {mockCustomsCount > 0 && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={voice.customsWaiting(mockCustomsCount)}
          style={({ pressed }) => [s.customs, pressed && s.pressed]}>
          <Icon name="inbox" size={19} color={c.ink} />
          <Text variant="body" style={s.customsText}>
            <RNText style={{ fontFamily: fonts.bodySemibold }}>{voice.things(mockCustomsCount)}</RNText>
            {` waiting at ${names.customs}`}
          </Text>
          <Icon name="chevronRight" size={16} color={c.ink} strokeWidth={1.8} />
        </Pressable>
      )}

      <NextStepCard
        title={next.title}
        meta={`${next.minutes} min · ${next.territory} · ${next.due}`}
        index={next.index}
        total={next.total}
        aiBuilt={next.aiBuilt}
      />

      <View style={s.agendaHead}>
        <Text variant="section" accessibilityRole="header">
          Today&apos;s agenda
        </Text>
        <View style={s.count}>
          <Text variant="label" color={c.muted} style={s.countText}>
            {agenda.length}
          </Text>
        </View>
      </View>

      <View style={s.list}>
        {agenda.map((item, i) => (
          <TaskRow key={item.id} item={item} last={i === agenda.length - 1} onToggle={toggle} />
        ))}
      </View>
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    date: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 12 },
    residency: {
      borderWidth: 1,
      borderColor: t.c.outline,
      borderRadius: t.radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    residencyText: { letterSpacing: 0.88 },
    greeting: { gap: 6 },
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
    agendaHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    count: { backgroundColor: t.c.chip, borderRadius: t.radii.sm, paddingHorizontal: 7, paddingVertical: 2 },
    countText: { letterSpacing: 0 },
    list: { marginTop: -6 },
    pressed: { opacity: 0.7 },
  }),
});
