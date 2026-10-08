import {
  actions,
  briefingOf,
  clockOf,
  dayPatch,
  formatShortDate,
  letGoPatch,
  linesFor,
  names,
  relativeDayPhrase,
  respreadPatches,
  todayPatch,
  undoPatch,
  voice,
  type PlanLeftovers,
  type Schedule,
  type Task,
} from '@pn/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionPill, LeftoverRow } from '@/components/briefing/leftover-row';
import { Button } from '@/components/button';
import { NoticeBar } from '@/components/notice-bar';
import { Sheet } from '@/components/sheet';
import { DateSheet } from '@/components/task/date-sheet';
import { Text } from '@/components/text';
import { useTasks } from '@/data/tasks-store';
import { useUserSettings } from '@/data/user-settings';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.briefing;

type Change = { task: Task; patch: Partial<Schedule> };

// A plan with more steps carried over than this shows them only when asked: Re-spread is the quick way.
const STEPS_SHOWN = 2;

/**
 * The Morning Briefing: everything that carried over from before today, each
 * given a place again (Today, Pick a day, Let it go), and plans that fell
 * behind spread out again. Every change applies at once and offers Undo.
 */
export function BriefingSheet({ onClose }: { onClose: () => void }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, today, update, notify } = useTasks();
  const { settings } = useUserSettings();
  const [picking, setPicking] = useState<Task | null>(null);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const toggleSteps = (id: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const briefing = briefingOf(tasks, today);
  const lines = linesFor(settings?.preferences.nudgeTone);

  // Applies the changes together; Undo puts back every field they changed.
  const apply = (changes: Change[], message: string) => {
    if (!changes.length) return;
    for (const { task, patch } of changes) update(task, patch);
    notify(message, () => {
      for (const { task, patch } of changes) update({ ...task, ...patch }, undoPatch(task, patch));
    });
  };

  const toToday = (t: Task) => apply([{ task: t, patch: todayPatch(t, today) }], copy.onToday(t.title));
  const letGo = (t: Task) => apply([{ task: t, patch: letGoPatch(t, today) }], copy.letGone(t.title));
  const moveAll = () => {
    const all = [...briefing.plans.flatMap((p) => p.steps), ...briefing.loose];
    apply(all.map((t) => ({ task: t, patch: todayPatch(t, today) })), copy.allToday(all.length));
  };
  const respread = (p: PlanLeftovers) => apply(respreadPatches(p.plan, p.open, today), copy.respreadDone(p.plan.title));

  const row = (t: Task) => (
    <LeftoverRow key={t.id} task={t} today={today} onToday={() => toToday(t)} onPick={() => setPicking(t)} onLetGo={() => letGo(t)} />
  );

  const deadline = (p: PlanLeftovers) => (p.plan.dueOn && p.plan.dueOn > today ? formatShortDate(p.plan.dueOn) : null);

  return (
    <Sheet
      onClose={onClose}
      title={names.morningBriefing}
      width={460}
      header={
        <Text variant="section" style={s.lead} accessibilityLiveRegion="polite">
          {briefing.count ? lines.briefingLead(briefing.count) : copy.allSorted}
        </Text>
      }
      footer={
        <View style={s.footer}>
          <NoticeBar />
          {briefing.count > 1 ? <Button variant="secondary" label={copy.moveAll} onPress={moveAll} /> : null}
          <Button variant={briefing.count ? 'quiet' : 'primary'} label={actions.done} onPress={onClose} />
        </View>
      }>
      {briefing.plans.map((p) => {
        const folds = p.steps.length > STEPS_SHOWN;
        const open = !folds || opened.has(p.plan.id);
        return (
          <View key={p.plan.id} style={s.plan}>
            <View style={s.planHead}>
              <Text variant="item" style={s.planTitle}>
                {p.plan.title}
              </Text>
              <Text variant="meta" color={c.muted}>
                {`${copy.planSteps(p.steps.length)}. ${copy.respreadHint(deadline(p))}`}
              </Text>
              <View style={s.planActions}>
                <ActionPill
                  label={copy.respread}
                  primary
                  onPress={() => respread(p)}
                  accessibilityLabel={copy.actionFor(copy.respread, p.plan.title)}
                />
                {folds ? (
                  <ActionPill
                    label={open ? copy.hideSteps : copy.oneByOne}
                    expanded={open}
                    onPress={() => toggleSteps(p.plan.id)}
                    accessibilityLabel={copy.actionFor(open ? copy.hideSteps : copy.oneByOne, p.plan.title)}
                  />
                ) : null}
              </View>
            </View>
            {open ? p.steps.map(row) : null}
          </View>
        );
      })}
      {briefing.loose.map(row)}

      {picking ? (
        <DateSheet
          title={copy.pickDay}
          day={today}
          time={picking.remindAt ? clockOf(picking.remindAt) : null}
          today={today}
          onSave={(day, time) => {
            const t = tasks.find((x) => x.id === picking.id) ?? picking;
            if (day) apply([{ task: t, patch: dayPatch(t, today, day, time) }], copy.movedTo(t.title, relativeDayPhrase(day, today)));
            else letGo(t);
            setPicking(null);
          }}
          onClose={() => setPicking(null)}
        />
      ) : null}
    </Sheet>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    lead: { paddingTop: 4, paddingBottom: 8 },
    plan: { marginBottom: 8 },
    planHead: { gap: 3, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.c.rule },
    planTitle: { fontFamily: t.fonts.bodySemibold },
    planActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    footer: { gap: 6, paddingBottom: 4 },
  }),
});
