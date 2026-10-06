import { buildTerritories, voice } from '@pn/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { NoticeBar } from '@/components/notice-bar';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { CustomsCard } from '@/components/territory/customs-card';
import { TerritoryCard } from '@/components/territory/territory-card';
import { TerritoryEditSheet } from '@/components/territory/territory-edit-sheet';
import { TerritoryView } from '@/components/territory/territory-view';
import { useLists } from '@/data/lists-store';
import { useTasks } from '@/data/tasks-store';
import { useIsWide } from '@/hooks/use-is-wide';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.territories;

export default function TerritoriesScreen() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const wide = useIsWide();
  const { tasks, today } = useTasks();
  const { lists, status, error, add, refresh } = useLists();
  const [creating, setCreating] = useState(false);
  // Laptop width shows one territory beside the list; phones open it as a page.
  const [selected, setSelected] = useState('customs');

  const view = useMemo(() => buildTerritories(lists, tasks, today), [lists, tasks, today]);
  const shown = selected === 'customs' || lists.some((l) => l.id === selected) ? selected : 'customs';
  const open = (id: string) => (wide ? setSelected(id) : router.push({ pathname: '/territory/[id]', params: { id } }));

  const index = (
    <View style={s.index}>
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

      {/* At laptop width the territory beside the list shows it. */}
      {wide ? null : <NoticeBar />}

      <CustomsCard count={view.customs.length} selected={wide && shown === 'customs'} onPress={() => open('customs')} />

      {status === 'loading' && lists.length === 0 ? <ActivityIndicator color={c.primary} style={s.loading} /> : null}
      {status === 'error' ? (
        <View style={s.failed}>
          <Text variant="body" color={c.inkSoft}>
            {copy.loadFailed}
          </Text>
          <Button variant="secondary" label={voice.today.retry} onPress={refresh} />
        </View>
      ) : null}

      {view.territories.map((summary) => (
        <TerritoryCard
          key={summary.list.id}
          summary={summary}
          today={today}
          selected={wide && shown === summary.list.id}
          onPress={() => open(summary.list.id)}
        />
      ))}

      {status === 'ready' && lists.length === 0 ? (
        <View style={s.empty}>
          <Text variant="body" color={c.inkSoft}>
            {copy.emptyLead}
          </Text>
          <View style={s.starters}>
            {copy.starters.map((starter) => (
              <Chip key={starter.name} label={starter.name} onPress={() => add({ ...starter })} />
            ))}
          </View>
        </View>
      ) : null}

      <Button
        variant="secondary"
        icon={<Icon name="plus" size={18} color={c.ink} />}
        label={copy.newTerritory}
        onPress={() => setCreating(true)}
      />
    </View>
  );

  const sheet = creating ? <TerritoryEditSheet onClose={() => setCreating(false)} onCreated={(l) => open(l.id)} /> : null;

  if (!wide) {
    return (
      <Screen>
        {index}
        {sheet}
      </Screen>
    );
  }
  return (
    <Screen aside={<ScrollView contentContainerStyle={s.aside}>{index}</ScrollView>}>
      <TerritoryView key={shown} id={shown} onDeleted={() => setSelected('customs')} />
      {sheet}
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    index: { gap: 14 },
    aside: { paddingRight: 8, paddingBottom: 32 },
    head: { gap: 6 },
    loading: { marginTop: 12 },
    failed: { gap: 10, alignItems: 'flex-start' },
    empty: { gap: 10 },
    starters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  }),
});
