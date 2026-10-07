import {
  actions,
  clockOf,
  describeRRule,
  duePatch,
  formatTime,
  relativeDayLabel,
  repeatPatch,
  stepContext,
  voice,
  whenPatch,
} from '@pn/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { NoticeBar } from '@/components/notice-bar';
import { Screen } from '@/components/screen';
import { DateSheet } from '@/components/task/date-sheet';
import { EstimateSheet } from '@/components/task/estimate-sheet';
import { FieldRow } from '@/components/task/field-row';
import { RepeatSheet } from '@/components/task/repeat-sheet';
import { StepsList } from '@/components/task/steps-list';
import { TerritorySheet } from '@/components/territory/territory-sheet';
import { Text } from '@/components/text';
import type { TaskPatch } from '@/data/tasks';
import { useLists } from '@/data/lists-store';
import { useTasks } from '@/data/tasks-store';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.task;
const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
const clock = (iso: string | null) => (iso ? ` · ${formatTime(new Date(iso))}` : '');

export default function TaskRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TaskDetail key={id} id={id} />;
}

type SheetKind = 'when' | 'due' | 'repeat' | 'estimate' | 'territory' | null;

/** Everything about one task, edited in place. Changes save as you make them. */
function TaskDetail({ id }: { id: string }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, status, today, toggle, update, remove, addStep } = useTasks();
  const { lists } = useLists();
  const task = tasks.find((t) => t.id === id && !t.deletedAt);
  const step = task ? stepContext(tasks, task) : null;
  const steps = tasks
    .filter((t) => t.parentId === id && !t.deletedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  const hasSteps = steps.length > 0;

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  // Multiline inputs don't grow by themselves on web; size them to their text.
  const [titleHeight, setTitleHeight] = useState(0);
  const [notesHeight, setNotesHeight] = useState(0);
  const deleted = useRef(false);

  /** Saves typed text that differs from what's stored. */
  const saveText = () => {
    if (!task || deleted.current) return;
    const patch: TaskPatch = {};
    const title = titleDraft?.trim();
    if (title && title !== task.title) patch.title = title;
    if (notesDraft !== null && (notesDraft.trim() || null) !== task.notes) patch.notes = notesDraft.trim() || null;
    if (Object.keys(patch).length) update(task, patch);
  };

  // Typing saves after a pause, and whatever is left saves when the page closes.
  const onPause = useEffectEvent(saveText);
  useEffect(() => {
    if (titleDraft === null && notesDraft === null) return;
    const timer = setTimeout(onPause, 800);
    return () => clearTimeout(timer);
  }, [titleDraft, notesDraft]);
  const onClose = useEffectEvent(saveText);
  useEffect(() => () => onClose(), []);

  useShortcuts(sheet ? {} : { Escape: close });

  if (!task) {
    return (
      <Screen>
        <View style={s.missing}>
          {status === 'ready' ? (
            <>
              <Text variant="lead" color={c.inkSoft}>
                {copy.notFound}
              </Text>
              <Button variant="secondary" label={copy.close} onPress={close} />
            </>
          ) : (
            <ActivityIndicator color={c.primary} />
          )}
        </View>
      </Screen>
    );
  }

  const done = !!task.completedAt;
  const canPlan = !task.parentId && task.source !== 'ai' && !task.rrule && !hasSteps && !done;
  const onDelete = () => {
    deleted.current = true;
    remove(task);
    close();
  };

  return (
    <Screen>
      <View style={s.column}>
        <View style={s.topBar}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={copy.close} style={s.iconButton}>
            <Icon name="close" color={c.ink} />
          </Pressable>
          <Text variant="label" color={c.muted}>
            {(task.parentId ? copy.stepEyebrow : copy.eyebrow).toUpperCase()}
          </Text>
          <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={copy.delete} style={s.iconButton}>
            <Icon name="trash" color={c.muted} />
          </Pressable>
        </View>

        <NoticeBar />

        {step?.parent ? (
          <Pressable
            onPress={() => router.push({ pathname: '/task/[id]', params: { id: step.parent!.id } })}
            accessibilityRole="link"
            style={s.partOf}>
            <Text variant="label" color={c.stamp.terracotta} style={s.partOfText}>
              {copy.partOf(step.parent.title).toUpperCase()}
            </Text>
          </Pressable>
        ) : null}

        <View style={s.titleRow}>
          <Pressable
            onPress={() => toggle(task)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            // React Native Web only exposes done through aria-checked.
            aria-checked={done}
            accessibilityLabel={(done ? copy.markNotDone : copy.markDone)(task.title)}
            style={s.check}>
            {done ? (
              <View style={s.checked}>
                <Icon name="check" size={15} color={c.onPrimary} strokeWidth={3} />
              </View>
            ) : (
              <View style={s.unchecked} />
            )}
          </Pressable>
          <TextInput
            value={titleDraft ?? task.title}
            onChangeText={setTitleDraft}
            onBlur={saveText}
            onContentSizeChange={(e) => setTitleHeight(e.nativeEvent.contentSize.height)}
            multiline
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            placeholder={copy.titlePlaceholder}
            placeholderTextColor={c.muted}
            accessibilityLabel={copy.titlePlaceholder}
            style={[s.t.text.pageTitle, s.title, done && s.titleDone, titleHeight ? { height: titleHeight + 10 } : null]}
          />
        </View>

        {!done ? (
          <View style={s.actions}>
            <Button
              label={actions.start}
              icon={<Icon name="play" size={16} color={c.onPrimary} strokeWidth={2} />}
              onPress={() => router.push({ pathname: '/start/[id]', params: { id: task.id } })}
            />
            {canPlan ? (
              <Button
                variant="secondary"
                label={actions.planIt}
                icon={<Icon name="shrink" size={16} color={c.ink} strokeWidth={2} />}
                onPress={() => router.push({ pathname: '/plan/[id]', params: { id: task.id } })}
              />
            ) : null}
          </View>
        ) : null}

        <View style={s.fields}>
          <FieldRow
            label={copy.when}
            value={task.scheduledOn ? relativeDayLabel(task.scheduledOn, today) + clock(task.remindAt) : copy.none}
            onPress={() => setSheet('when')}
          />
          {!task.parentId ? (
            <FieldRow
              label={copy.due}
              value={task.dueOn ? relativeDayLabel(task.dueOn, today) + clock(task.dueAt) : copy.none}
              onPress={() => setSheet('due')}
            />
          ) : null}
          {!task.parentId && !hasSteps ? (
            <FieldRow
              label={copy.repeat}
              value={task.rrule ? describeRRule(task.rrule) : copy.never}
              onPress={() => setSheet('repeat')}
            />
          ) : null}
          <FieldRow
            label={copy.estimate}
            value={task.estimateMinutes ? copy.minutes(task.estimateMinutes) : copy.none}
            onPress={() => setSheet('estimate')}
            last={!!task.parentId}
          />
          {/* A plan's steps live in their plan's territory. */}
          {!task.parentId ? (
            <FieldRow
              label={copy.territory}
              value={lists.find((l) => l.id === task.listId)?.name ?? copy.none}
              onPress={() => setSheet('territory')}
              last
            />
          ) : null}
        </View>

        {/* Steps belong to top-level, one-off tasks (a repeating task's steps would need resetting). */}
        {!task.parentId && !task.rrule && (hasSteps || !done) ? (
          <StepsList
            steps={steps}
            onToggle={toggle}
            onOpen={(st) => router.push({ pathname: '/task/[id]', params: { id: st.id } })}
            onMove={(st, sortOrder) => update(st, { sortOrder })}
            onAdd={(title) => addStep(task, title)}
          />
        ) : null}
        {!done && steps.some((t) => t.source === 'ai') && steps.some((t) => !t.completedAt) ? (
          <View style={s.replan}>
            <Button
              variant="quiet"
              label={voice.plan.replan}
              icon={<Icon name="shrink" size={15} color={c.primaryText} strokeWidth={2} />}
              onPress={() => router.push({ pathname: '/plan/[id]', params: { id: task.id, replan: '1' } })}
            />
          </View>
        ) : null}

        <View style={s.notes}>
          <Text variant="label" color={c.muted}>
            {copy.notes.toUpperCase()}
          </Text>
          <TextInput
            value={notesDraft ?? task.notes ?? ''}
            onChangeText={setNotesDraft}
            onBlur={saveText}
            onContentSizeChange={(e) => setNotesHeight(e.nativeEvent.contentSize.height)}
            multiline
            placeholder={copy.notesPlaceholder}
            placeholderTextColor={c.muted}
            accessibilityLabel={copy.notes}
            style={[s.t.text.body, s.notesInput, notesHeight ? { height: Math.max(120, notesHeight + 28) } : null]}
          />
        </View>
      </View>

      {sheet === 'when' ? (
        <DateSheet
          title={copy.when}
          day={task.scheduledOn}
          time={task.remindAt ? clockOf(task.remindAt) : null}
          today={today}
          allowRepeat={!task.parentId && !hasSteps}
          onSave={(day, time, rrule) => {
            const when = whenPatch(day, time);
            update(task, rrule ? { ...when, ...repeatPatch({ ...task, ...when }, rrule, today) } : when);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'due' ? (
        <DateSheet
          title={copy.due}
          day={task.dueOn}
          time={task.dueAt ? clockOf(task.dueAt) : null}
          today={today}
          onSave={(day, time) => {
            update(task, duePatch(day, time));
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'estimate' ? (
        <EstimateSheet
          minutes={task.estimateMinutes}
          onSave={(estimateMinutes) => {
            update(task, { estimateMinutes });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'territory' ? (
        <TerritorySheet
          selected={task.listId}
          onPick={(listId) => {
            update(task, { listId });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {sheet === 'repeat' ? (
        <RepeatSheet
          rrule={task.rrule}
          anchor={task.scheduledOn ?? today}
          onSave={(rrule) => {
            update(task, repeatPatch(task, rrule, today));
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    column: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 14 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -12 },
    iconButton: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    missing: { gap: 12, alignItems: 'flex-start', paddingTop: 48 },
    partOf: { minHeight: 28, justifyContent: 'center' },
    partOfText: { letterSpacing: 1.2 },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginLeft: -10 },
    check: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    unchecked: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: t.c.checkbox },
    checked: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: t.c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { flex: 1, color: t.c.ink, paddingTop: 6, paddingBottom: 4 },
    titleDone: { color: t.c.muted },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    fields: {
      backgroundColor: t.c.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      borderRadius: t.radii.card,
      paddingHorizontal: 16,
    },
    replan: { alignItems: 'flex-start', marginTop: -6 },
    notes: { gap: 8 },
    notesInput: {
      minHeight: 120,
      padding: 14,
      color: t.c.ink,
      textAlignVertical: 'top',
      backgroundColor: t.c.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      borderRadius: t.radii.card,
    },
  }),
});
