import { parseSearch, voice } from '@pn/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { NoticeBar } from '@/components/notice-bar';
import { NoteGroup, TaskGroup } from '@/components/search/result-groups';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useLists } from '@/data/lists-store';
import { useIsWide } from '@/hooks/use-is-wide';
import { useSearch } from '@/hooks/use-search';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { noFocusRing } from '@/lib/web-styles';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.search;
const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * Search: tasks (open, then finished) and notes, as the person types.
 * "#chem" narrows to a territory. A page on phones; a panel over the page
 * at laptop width on web.
 */
export default function SearchScreen() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const wide = useIsWide();
  const { lists } = useLists();
  const [text, setText] = useState('');
  const { words, listId, tag } = useMemo(() => parseSearch(text, lists), [text, lists]);
  const search = useSearch(words, listId);
  const places = useMemo(() => new Map(lists.map((l) => [l.id, l.name])), [lists]);
  const territory = lists.find((l) => l.id === listId);
  const found = search.open.hits.length + search.done.hits.length + search.notes.hits.length;

  useShortcuts({ Escape: close });

  const body = (
    <View style={s.column}>
      <View style={s.bar}>
        <View style={s.field}>
          <View style={s.glass}>
            <Icon name="search" size={18} color={c.muted} strokeWidth={1.9} />
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            // Escape leaves on web, even while typing (page shortcuts skip fields).
            onKeyPress={(e) => e.nativeEvent.key === 'Escape' && close()}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            placeholder={copy.placeholder}
            placeholderTextColor={c.muted}
            accessibilityLabel={copy.title}
            style={[s.t.text.body, s.input, noFocusRing]}
          />
          {search.searching ? <ActivityIndicator size="small" color={c.muted} /> : null}
        </View>
        <Button variant="quiet" label={copy.cancel} onPress={close} />
      </View>

      {territory && tag ? (
        <Pressable
          onPress={() => setText(text.replace(tag, ' ').replace(/\s+/g, ' ').trimStart())}
          accessibilityRole="button"
          accessibilityLabel={copy.clearTerritory(territory.name)}
          style={({ pressed }) => [s.chip, pressed && s.pressed]}>
          <Icon name="map" size={13} color={c.stamp[territory.ink]} strokeWidth={2} />
          <Text variant="meta" color={c.ink}>
            {territory.name}
          </Text>
          <Icon name="close" size={12} color={c.muted} strokeWidth={2} />
        </Pressable>
      ) : null}

      <NoticeBar />

      {search.idle ? (
        <Text variant="body" color={c.inkSoft}>
          {territory ? copy.hintIn(territory.name) : copy.hint}
        </Text>
      ) : search.failed ? (
        <View style={s.failed}>
          <Text variant="body" color={c.error} accessibilityLiveRegion="polite">
            {copy.failed}
          </Text>
          <Button variant="secondary" label={voice.today.retry} onPress={search.retry} />
        </View>
      ) : (
        <>
          <TaskGroup
            label={copy.tasks}
            page={search.open}
            loading={search.loadingMore === 'open'}
            onMore={() => search.showMore('open')}
            places={places}
          />
          <TaskGroup
            label={copy.finished}
            page={search.done}
            loading={search.loadingMore === 'done'}
            onMore={() => search.showMore('done')}
            places={places}
          />
          <NoteGroup
            label={copy.notes}
            page={search.notes}
            loading={search.loadingMore === 'notes'}
            onMore={() => search.showMore('notes')}
            places={places}
          />
          {!search.searching && found === 0 ? (
            <Text variant="body" color={c.inkSoft} accessibilityLiveRegion="polite">
              {territory ? copy.noMatchesIn(words, territory.name) : copy.noMatches(words)}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );

  if (Platform.OS === 'web' && wide) {
    // Laptop: a panel over the page, like quick add.
    return (
      <View style={s.overlay}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={copy.cancel}
        />
        <View style={s.panel} accessibilityViewIsModal>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.panelContent}>
            {body}
          </ScrollView>
        </View>
      </View>
    );
  }
  return <Screen>{body}</Screen>;
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 16 },
    bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    field: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 44,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
    },
    glass: { width: 18, height: 18 },
    // minWidth 0: a web input otherwise keeps its default width and squeezes the icon out.
    input: { flex: 1, minWidth: 0, color: t.c.ink, paddingVertical: 10 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      minHeight: 32,
      paddingHorizontal: 12,
      borderRadius: t.radii.pill,
      borderWidth: 1,
      borderColor: t.c.outline,
      backgroundColor: t.c.card,
    },
    failed: { gap: 10, alignItems: 'flex-start' },
    pressed: { opacity: 0.7 },
    overlay: { flex: 1, alignItems: 'center', paddingTop: 72, paddingHorizontal: 24 },
    panel: {
      width: '100%',
      maxWidth: 640,
      maxHeight: '80%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: t.c.rule,
      backgroundColor: t.c.bg,
      overflow: 'hidden',
    },
    panelContent: { padding: 20 },
  }),
});
