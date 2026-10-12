import {
  clockOf,
  declaredWhen,
  firstWeekOf,
  formatTimeShort,
  localDateString,
  morningListOf,
  relativeDayLabel,
  voice,
  type Task,
} from '@pn/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApplicationForm } from '@/components/application/application-form';
import { Button } from '@/components/button';
import { SignaturePad } from '@/components/declare/signature-pad';
import { DeclarationChoices, useDeclaration } from '@/components/declare/use-declaration';
import { Text } from '@/components/text';
import { useTasks } from '@/data/tasks-store';
import { useUserSettings } from '@/data/user-settings';
import { useReminders } from '@/notifications/reminders-provider';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.application;

/** Your first week: the Oath's real plan laid out by day (no template). */
export function FirstWeekPage({ planId, onContinue }: { planId: string; onContinue: () => void }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { tasks, today } = useTasks();
  const week = firstWeekOf(tasks, planId, today);

  return (
    <ApplicationForm
      page="firstWeek"
      title={copy.firstWeekTitle}
      lead={copy.firstWeekLead}
      footer={
        <>
          <View />
          <Button label={copy.next} onPress={onContinue} />
        </>
      }>
      {week.length === 0 ? (
        <Text variant="body" color={c.inkSoft}>
          {copy.firstWeekNone}
        </Text>
      ) : (
        week.map(({ day, steps }) => (
          <View key={day} style={s.day}>
            <Text variant="label" color={c.primaryText}>
              {relativeDayLabel(day, today).toUpperCase()}
            </Text>
            {steps.map((step) => (
              <View key={step.id} style={s.step}>
                <Text variant="body" style={s.stepTitle}>
                  {step.title}
                </Text>
                {step.estimateMinutes ? (
                  <Text variant="labelSmall" color={c.muted}>
                    {step.estimateMinutes} min
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ))
      )}
    </ApplicationForm>
  );
}

type DeclareProps = {
  /** The Oath's plan's first open step. */
  step: Task;
  onContinue: () => void;
  /** A stroke on the signature line holds the page still. */
  onDrawing: (drawing: boolean) => void;
};

/** Their first Declaration: a start time signed for the Oath's first step. "Not now" is fine. */
export function DeclarePage({ step, onContinue, onDrawing }: DeclareProps) {
  const s = useStyles(makeStyles);
  const d = useDeclaration(step);

  return (
    <ApplicationForm
      page="declare"
      title={copy.declareTitle}
      lead={copy.declareLead(step.title)}
      footer={
        <>
          <Button variant="quiet" label={copy.notNow} onPress={onContinue} />
          <Button label={voice.declaration.declare} disabled={!d.ready} onPress={() => d.declare() && onContinue()} />
        </>
      }>
      <Text variant="step" style={s.statement} accessibilityLiveRegion="polite">
        {d.statement}
      </Text>
      <DeclarationChoices d={d} />
      <SignaturePad value={d.signature} onChange={d.setSignature} name={d.signedName} onDrawing={onDrawing} />
    </ApplicationForm>
  );
}

/**
 * A nudge for the next step: the morning list, asked for with its reason in view (primed), then
 * the system's own prompt (iOS) or the browser's. "Not now" is fine. After their first Declaration,
 * the reason in view is that Declaration's nudge.
 */
export function NudgePage({ declared, onContinue }: { declared?: Task | null; onContinue: () => void }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  // The calendar's day, as the Declaration was signed in (a night owl's day hasn't rolled over at 1 AM).
  const [today] = useState(() => localDateString(new Date()));
  const { settings, savePreferences } = useUserSettings();
  const { permission, allow, dismissAsk } = useReminders();
  const morning = morningListOf(settings?.preferences);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = permission === 'denied' || permission === 'unsupported';

  const yes = async () => {
    setBusy(true);
    setError(null);
    try {
      await savePreferences({ reminders: { ...settings?.preferences.reminders, morningList: { ...morning, on: true } } });
      if (permission === 'undetermined') await allow();
      onContinue();
    } catch {
      setError(copy.saveFailed);
      setBusy(false);
    }
  };

  return (
    <ApplicationForm
      page="nudge"
      title={copy.nudgeTitle}
      error={error}
      footer={
        <>
          <Button
            variant="quiet"
            label={copy.notNow}
            onPress={() => {
              // They just answered for the Declaration's time too: Today won't ask again.
              dismissAsk();
              onContinue();
            }}
            disabled={busy}
          />
          {blocked ? <Button label={copy.next} onPress={onContinue} /> : <Button label={copy.nudgeYes} onPress={yes} disabled={busy} />}
        </>
      }>
      <Text variant="lead" color={c.inkSoft}>
        {declared?.scheduledOn && declared.remindAt
          ? copy.nudgeBodyDeclared(
              declaredWhen(declared.scheduledOn, clockOf(declared.remindAt), today),
              formatTimeShort(morning.hour, morning.minute),
            )
          : copy.nudgeBody(formatTimeShort(morning.hour, morning.minute))}
      </Text>
      {blocked ? (
        <Text variant="meta" color={c.muted}>
          {copy.nudgeOff}
        </Text>
      ) : null}
    </ApplicationForm>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    day: { gap: 6, paddingTop: 4 },
    step: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
    stepTitle: { flex: 1 },
    statement: { paddingTop: 2 },
  }),
});
