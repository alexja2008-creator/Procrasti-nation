import { joinTitle, noteHasContent, splitTitle, voice } from '@pn/core';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { NoticeBar } from '@/components/notice-bar';
import { Screen } from '@/components/screen';
import { TerritorySheet } from '@/components/territory/territory-sheet';
import { Text } from '@/components/text';
import { useLists } from '@/data/lists-store';
import { useNotes } from '@/data/notes-store';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.notes;
/** Saves land this long after the last keystroke. */
const SAVE_DELAY = 600;
const close = () => (router.canGoBack() ? router.back() : router.replace('/territories'));
// Web textareas start two rows tall; a title starts as one (RN's types don't know `rows`).
const oneRowOnWeb = Platform.OS === 'web' ? ({ rows: 1 } as object) : {};

type Draft = { title: string; rest: string; listId: string | null };

export default function NoteRoute() {
  const { id, list } = useLocalSearchParams<{ id: string; list?: string }>();
  return <NoteDetail key={id} param={id} presetList={list ?? null} />;
}

/** One note, edited in place. `param` is its id, or 'new' (filed in `presetList`). */
function NoteDetail({ param, presetList }: { param: string; presetList: string | null }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const isNew = param === 'new';
  const [id] = useState(() => (isNew ? Crypto.randomUUID() : param));
  const { notes, status, error, save, remove } = useNotes();
  const { lists } = useLists();
  const note = notes.find((n) => n.id === id);

  // The note as stored until the first edit; from then on, the copy edited here.
  const [edited, setEdited] = useState<Draft | null>(isNew ? { title: '', rest: '', listId: presetList } : null);
  const draft = edited ?? (note ? { ...splitTitle(note.body), listId: note.listId } : null);
  const latest = useRef(edited);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // A new note is created by its first save with words in it.
  const saved = useRef(!isNew);
  const [picking, setPicking] = useState(false);
  const [titleHeight, setTitleHeight] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);
  const bodyRef = useRef<TextInput>(null);

  const flush = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const d = latest.current;
    if (!d) return;
    const body = joinTitle(d.title, d.rest);
    if (!saved.current && !noteHasContent(body)) return;
    saved.current = true;
    save(id, { body, listId: d.listId });
  };
  const change = (patch: Partial<Draft>, delay = SAVE_DELAY) => {
    const base = latest.current ?? draft;
    if (!base) return;
    const next = { ...base, ...patch };
    latest.current = next;
    setEdited(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };

  // Return in the title (or pasting several lines) moves on to the body,
  // carrying anything after the line break to the body's start.
  const onTitle = (text: string) => {
    const nl = text.indexOf('\n');
    if (nl === -1) return change({ title: text });
    const base = latest.current ?? draft;
    const carried = text.slice(nl + 1);
    const rest = base?.rest ?? '';
    change({ title: text.slice(0, nl), rest: carried ? (rest ? `${carried}\n${rest}` : carried) : rest });
    bodyRef.current?.focus();
  };

  // Leaving by swipe or back still saves what was typed.
  const onLeave = useEffectEvent(() => {
    if (timer.current) flush();
  });
  useEffect(() => () => onLeave(), []);

  const onClose = () => {
    flush();
    const d = latest.current ?? draft;
    // An emptied note goes away quietly, like a blank page.
    if (note && d && !noteHasContent(joinTitle(d.title, d.rest))) remove(note, { quiet: true });
    close();
  };
  const onDelete = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    if (note) remove(note);
    close();
  };

  if (!draft) {
    return (
      <Screen>
        <View style={s.column}>
          {status === 'loading' ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <View style={s.missing}>
              <Text variant="body" color={c.inkSoft}>
                {copy.notFound}
              </Text>
              <Pressable onPress={close} accessibilityRole="button">
                <Text variant="button" color={c.primaryText}>
                  {copy.close}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </Screen>
    );
  }

  const territory = lists.find((l) => l.id === draft.listId);

  return (
    <Screen>
      <View style={s.column}>
        <View style={s.topBar}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={copy.close} style={s.iconButton}>
            <Icon name="close" color={c.ink} />
          </Pressable>
          <Text variant="label" color={c.muted}>
            {copy.eyebrow.toUpperCase()}
          </Text>
          <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={copy.delete} style={s.iconButton}>
            <Icon name="trash" color={c.muted} />
          </Pressable>
        </View>

        {error ? (
          <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <NoticeBar />

        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={`${voice.task.territory}: ${territory?.name ?? copy.noTerritory}`}
          style={({ pressed }) => [s.territory, pressed && s.pressed]}>
          <Icon name="map" size={14} color={territory ? c.stamp[territory.ink] : c.muted} strokeWidth={1.9} />
          <Text variant="label" color={territory ? c.stamp[territory.ink] : c.muted}>
            {(territory?.name ?? copy.noTerritory).toUpperCase()}
          </Text>
        </Pressable>

        <TextInput
          value={draft.title}
          onChangeText={onTitle}
          onSubmitEditing={() => bodyRef.current?.focus()}
          onContentSizeChange={(e) => setTitleHeight(e.nativeEvent.contentSize.height)}
          multiline
          {...oneRowOnWeb}
          submitBehavior="blurAndSubmit"
          returnKeyType="next"
          autoFocus={isNew}
          placeholder={copy.titlePlaceholder}
          placeholderTextColor={c.muted}
          accessibilityLabel={copy.titlePlaceholder}
          style={[s.t.text.pageTitle, s.title, titleHeight ? { height: titleHeight + 6 } : null]}
        />

        <TextInput
          ref={bodyRef}
          value={draft.rest}
          onChangeText={(rest) => change({ rest })}
          onContentSizeChange={(e) => setBodyHeight(e.nativeEvent.contentSize.height)}
          multiline
          scrollEnabled={false}
          placeholder={copy.placeholder}
          placeholderTextColor={c.muted}
          accessibilityLabel={copy.title}
          style={[s.t.text.lead, s.body, bodyHeight ? { height: Math.max(200, bodyHeight + 12) } : null]}
        />
      </View>

      {picking ? (
        <TerritorySheet
          selected={draft.listId}
          onPick={(listId) => {
            change({ listId }, 0);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    column: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 12 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -12 },
    iconButton: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    missing: { gap: 12, alignItems: 'flex-start', paddingTop: 48 },
    territory: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32 },
    // The page is the paper: no box or focus ring around the writing.
    title: { color: t.c.ink, padding: 0, outlineWidth: 0 },
    body: { color: t.c.ink, padding: 0, minHeight: 200, textAlignVertical: 'top', outlineWidth: 0 },
    pressed: { opacity: 0.7 },
  }),
});
