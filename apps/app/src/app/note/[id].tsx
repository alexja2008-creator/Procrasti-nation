import { joinTitle, mergeText, noteHasContent, parseNoteBody, serializeNoteBody, splitTitle, voice } from '@pn/core';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Icon } from '@/components/icon';
import { ChecklistHint } from '@/components/note/checklist-hint';
import { NoteEditor, type NoteEditorHandle } from '@/components/note/note-editor';
import { NoticeBar } from '@/components/notice-bar';
import { Screen } from '@/components/screen';
import { TerritorySheet } from '@/components/territory/territory-sheet';
import { Text } from '@/components/text';
import { loadChecklistLearned, saveChecklistLearned } from '@/data/checklist-hint';
import { useLists } from '@/data/lists-store';
import { useNotes } from '@/data/notes-store';
import { useTasks } from '@/data/tasks-store';
import { useAutoHeight } from '@/hooks/use-auto-height';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { noFocusRing, oneRowOnWeb } from '@/lib/web-styles';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.notes;
/** Saves land this long after the last keystroke. */
const SAVE_DELAY = 600;
const close = () => (router.canGoBack() ? router.back() : router.replace('/territories'));

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
  const { notes, error, save, remove, ensure } = useNotes();
  const { lists } = useLists();
  const { tasks, error: taskError, setDeletedMany } = useTasks();
  const note = notes.find((n) => n.id === id);

  // A note older than the pages loaded (opened from a link) is fetched on its own.
  const [missing, setMissing] = useState(false);
  const fetchNote = useEffectEvent(() => {
    ensure(id).then((found) => setMissing(!found), () => setMissing(true));
  });
  const known = isNew || !!note;
  useEffect(() => {
    if (!known) fetchNote();
  }, [known]);

  // The note as stored until the first edit; from then on, the copy edited here.
  const [edited, setEdited] = useState<Draft | null>(isNew ? { title: '', rest: '', listId: presetList } : null);
  const draft = edited ?? (note ? { ...splitTitle(note.body), listId: note.listId } : null);
  const titleGrow = useAutoHeight(draft?.title ?? '');
  const latest = useRef(edited);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // A new note is created by its first save with words in it.
  const saved = useRef(!isNew);
  const [picking, setPicking] = useState(false);
  const editor = useRef<NoteEditorHandle>(null);

  // The tip under the title shows until they've made a line a task here (or hidden it).
  const userId = useAuth().session?.user.id;
  const [learned, setLearned] = useState(true);
  useEffect(() => {
    if (userId) loadChecklistLearned(userId).then(setLearned);
  }, [userId]);
  const learn = () => {
    if (learned) return;
    setLearned(true);
    if (userId) saveChecklistLearned(userId);
  };
  const toggleChecklist = () => {
    editor.current?.toggleChecklist();
    learn();
  };

  const flush = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const d = latest.current;
    if (!d) return;
    const body = joinTitle(d.title, d.rest);
    if (!saved.current && !noteHasContent(body)) return;
    saved.current = true;
    save(id, { body, listId: d.listId }).catch(() => undefined);
  };
  /** Saves now with this body under the title; settles once the note exists. */
  const saveNow = (rest: string) => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const base = latest.current ?? draft;
    const next = { title: base?.title ?? '', rest, listId: base?.listId ?? null };
    latest.current = next;
    saved.current = true;
    return save(id, { body: joinTitle(next.title, rest), listId: next.listId });
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
    titleGrow.reset();
    editor.current?.focusStart();
  };

  // ⌘⇧L toggles a checklist line, as in Apple Notes (web; iOS uses the ☐ button).
  useShortcuts(picking ? {} : { 'Mod+Shift+L': toggleChecklist, Escape: () => onClose() });

  // Leaving by swipe or back still saves what was typed.
  const onLeave = useEffectEvent(() => {
    if (timer.current) flush();
  });
  useEffect(() => () => onLeave(), []);

  const onClose = () => {
    // Checklist lines left without words go, with their tasks.
    const base = latest.current ?? draft;
    if (base) {
      const blocks = parseNoteBody(base.rest);
      const blank = blocks.flatMap((b) => {
        const t = b.kind === 'task' ? tasks.find((x) => x.id === b.taskId) : undefined;
        // Words still being typed count (a tap on Close leaves the line focused, unsaved).
        const words = t ? (editor.current?.wordsOf(t.id) ?? t.title) : '';
        return t && !words.trim() && !t.completedAt ? [t.id] : [];
      });
      if (blank.length) {
        change({ rest: serializeNoteBody(mergeText(blocks.filter((b) => !(b.kind === 'task' && blank.includes(b.taskId))))) });
        setDeletedMany(blank, new Date().toISOString()).catch(() => undefined);
      }
    }
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
          {!missing ? (
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
    // The top bar (with ☐) stays put while a long note scrolls.
    <Screen stickyHeaderIndices={[0]}>
      <View style={s.bar}>
        <View style={s.topBar}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={copy.close} style={s.iconButton}>
            <Icon name="close" color={c.ink} />
          </Pressable>
          <Text variant="label" color={c.muted} style={s.eyebrow}>
            {copy.eyebrow.toUpperCase()}
          </Text>
          <Pressable
            onPress={toggleChecklist}
            accessibilityRole="button"
            accessibilityLabel={copy.checklist}
            style={({ pressed }) => [s.iconButton, pressed && s.pressed]}>
            <Icon name="checkbox" color={c.primaryText} strokeWidth={1.9} />
          </Pressable>
          <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={copy.delete} style={s.iconButton}>
            <Icon name="trash" color={c.muted} />
          </Pressable>
        </View>
      </View>

      <View style={s.column}>
        {error || taskError ? (
          <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
            {error ?? taskError}
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
          onSubmitEditing={() => editor.current?.focusStart()}
          onContentSizeChange={titleGrow.onContentSizeChange}
          multiline
          {...oneRowOnWeb}
          submitBehavior="blurAndSubmit"
          returnKeyType="next"
          autoFocus={isNew}
          placeholder={copy.titlePlaceholder}
          placeholderTextColor={c.muted}
          accessibilityLabel={copy.titlePlaceholder}
          style={[s.t.text.pageTitle, s.title, noFocusRing, titleGrow.style]}
        />

        {!learned && !parseNoteBody(draft.rest).some((b) => b.kind === 'task') ? <ChecklistHint onHide={learn} /> : null}

        <NoteEditor
          ref={editor}
          rest={draft.rest}
          onChange={(rest) => change({ rest })}
          saveNow={saveNow}
          noteId={id}
          listId={draft.listId}
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
    // Opaque, so the writing scrolls out of sight beneath it.
    bar: { backgroundColor: t.c.bg },
    topBar: { width: '100%', maxWidth: 560 + 24, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', marginHorizontal: -12 },
    eyebrow: { flex: 1, textAlign: 'center' },
    iconButton: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    missing: { gap: 12, alignItems: 'flex-start', paddingTop: 48 },
    territory: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 32 },
    title: { color: t.c.ink, padding: 0 },
    pressed: { opacity: 0.7 },
  }),
});
