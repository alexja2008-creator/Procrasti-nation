import {
  actions,
  briefingOf,
  clockOf,
  dayPatch,
  formatShortDate,
  isLongBriefing,
  letGoPatch,
  linesFor,
  LONG_BRIEFING,
  names,
  PICK_MOST,
  picksOf,
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
import { PickRow } from '@/components/briefing/pick-row';
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

type Props = {
  recap: string | null;
  onClose: () => void;
  /** Rests the card for the day (Not now, or three picked: the rest can wait). */
  onPutOff: () => void;
  /** Brings the card back (Undo of Pick three). */
  onBringBack: () => void;
};

/**
 * The Morning Briefing: everything that carried over from before today, each
 * given a place again (Today, Pick a day, Let it go), and plans that fell
 * behind spread out again. Every change applies at once and offers Undo.
 * A long one opens on Pick three instead: a few things for today, and the rest wait.
 */
export function BriefingSheet({ recap, onClose, onPutOff, onBringBack }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, today, update, notify } = useTasks();
  const { settings } = useUserSettings();
  const briefing = briefingOf(tasks, today);
  const lines = linesFor(settings?.preferences.nudgeTone);
  const [picking, setPicking] = useState<Task | null>(null);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const toggleSteps = (id: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  // Pick three: the suggestion is ticked once, when the list is first long (usually on opening;
  // set while rendering, React's way to adjust state to new data); after that the ticks are theirs.
  const long = isLongBriefing(briefing, today);
  const [oneByOne, setOneByOne] = useState(false);
  const choosing = long && !oneByOne;
  const picks = long ? picksOf(briefing, today) : [];
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [suggested, setSuggested] = useState(false);
  if (long && !suggested) {
    setSuggested(true);
    setTicked(new Set(picks.slice(0, PICK_MOST).map((p) => p.task.id)));
  }
  const [restShown, setRestShown] = useState(false);
  // A fourth tap while three are ticked: a line above Put on today says to untick one first.
  const [triedFourth, setTriedFourth] = useState(false);
  const chosen = picks.filter((p) => ticked.has(p.task.id)).map((p) => p.task);
  const full = chosen.length >= PICK_MOST;
  // The suggestions first; a tick from the rest stays in sight when the rest is hidden.
  const shownPicks = restShown ? picks : picks.filter((p, i) => i < PICK_MOST || ticked.has(p.task.id));
  const hiddenPicks = picks.length - shownPicks.length;
  // From what's ticked and still listed: a tick on something sorted elsewhere meanwhile drops out.
  const toggleTick = (id: string) => {
    const ids = chosen.map((t) => t.id);
    const was = ids.includes(id);
    if (full && !was) return setTriedFourth(true);
    setTriedFourth(false);
    setTicked(new Set(was ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  // Applies the changes together; Undo puts back every field they changed.
  const apply = (changes: Change[], message: string, undone?: () => void) => {
    if (!changes.length) return;
    for (const { task, patch } of changes) update(task, patch);
    notify(message, () => {
      for (const { task, patch } of changes) update({ ...task, ...patch }, undoPatch(task, patch));
      undone?.();
    });
  };

  const toToday = (t: Task) => apply([{ task: t, patch: todayPatch(t, today) }], copy.onToday(t.title));
  const letGo = (t: Task) => apply([{ task: t, patch: letGoPatch(t, today) }], copy.letGone(t.title));
  const moveAll = () => {
    const all = [...briefing.plans.flatMap((p) => p.steps), ...briefing.loose];
    apply(all.map((t) => ({ task: t, patch: todayPatch(t, today) })), copy.allToday(all.length));
  };
  const respread = (p: PlanLeftovers) => apply(respreadPatches(p.plan, p.open, today), copy.respreadDone(p.plan.title));
  // The picks go on today and the rest wait: the card rests for the day (Undo brings it back).
  const putOnToday = () => {
    if (!chosen.length) return;
    apply(
      chosen.map((t) => ({ task: t, patch: todayPatch(t, today) })),
      copy.pickedToday(chosen.length),
      onBringBack,
    );
    onPutOff();
    onClose();
  };
  const notNow = () => {
    onPutOff();
    onClose();
  };

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
        <View style={s.lead}>
          {recap ? (
            <Text variant="meta" color={c.primaryText}>
              {recap}
            </Text>
          ) : null}
          <Text variant="section" accessibilityLiveRegion="polite">
            {!briefing.count ? copy.allSorted : choosing ? lines.briefingPickLead(briefing.count) : lines.briefingLead(briefing.count)}
          </Text>
          {choosing ? (
            <Text variant="meta" color={c.muted}>
              {copy.pickWhy}
            </Text>
          ) : null}
        </View>
      }
      footer={
        choosing ? (
          <View style={s.footer}>
            <NoticeBar />
            {/* Pinned, so it's in view wherever the list is scrolled to. */}
            {triedFourth && full ? (
              <Text variant="meta" color={c.muted} style={s.full} accessibilityLiveRegion="polite">
                {copy.pickFull}
              </Text>
            ) : null}
            <Button label={copy.putOnToday(chosen.length)} disabled={!chosen.length} onPress={putOnToday} />
            <View style={s.footerRow}>
              <Button variant="quiet" label={copy.sortEach} onPress={() => setOneByOne(true)} />
              <Button variant="quiet" label={copy.notNow} onPress={notNow} />
            </View>
          </View>
        ) : (
          <View style={s.footer}>
            <NoticeBar />
            {/* With this many, all of it on today is the pile again. */}
            {briefing.count > 1 && briefing.count < LONG_BRIEFING ? (
              <Button variant="secondary" label={copy.moveAll} onPress={moveAll} />
            ) : null}
            {long ? <Button variant="quiet" label={copy.pickInstead} onPress={() => setOneByOne(false)} /> : null}
            <Button variant={briefing.count ? 'quiet' : 'primary'} label={actions.done} onPress={onClose} />
          </View>
        )
      }>
      {choosing ? (
        <>
          {shownPicks.map((p) => (
            <PickRow
              key={p.task.id}
              pick={p}
              today={today}
              ticked={ticked.has(p.task.id)}
              full={full}
              onToggle={() => toggleTick(p.task.id)}
            />
          ))}
          {restShown || hiddenPicks > 0 ? (
            <View style={s.rest}>
              <Button
                variant="quiet"
                label={restShown ? copy.hideRest : copy.showRest(hiddenPicks)}
                onPress={() => setRestShown((v) => !v)}
              />
            </View>
          ) : null}
        </>
      ) : null}
      {choosing ? null : briefing.plans.map((p) => {
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
      {choosing ? null : briefing.loose.map(row)}

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
    lead: { gap: 4, paddingTop: 4, paddingBottom: 8 },
    plan: { marginBottom: 8 },
    planHead: { gap: 3, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.c.rule },
    planTitle: { fontFamily: t.fonts.bodySemibold },
    planActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    footer: { gap: 6, paddingBottom: 4 },
    full: { textAlign: 'center' },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
    rest: { alignItems: 'flex-start', marginLeft: -8, paddingTop: 4, borderTopWidth: 1, borderTopColor: t.c.rule },
  }),
});
