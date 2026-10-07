import {
  helpCardsFor,
  nudgeTones,
  resultAudience,
  voice,
  type ApplicationPage,
  type HeardFrom,
  type HelpCard,
  type Hours,
  type NudgeToneId,
  type Persona,
  type Preferences,
  type ProcrastinationStyle,
} from '@pn/core';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApplicationForm } from '@/components/application/application-form';
import { ChoiceCards, type Choice } from '@/components/application/choice-cards';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.application;

const tones: Choice<NudgeToneId>[] = (Object.keys(nudgeTones) as NudgeToneId[]).map((id) => ({
  id,
  label: nudgeTones[id].name,
  hint: nudgeTones[id].blurb,
  sample: nudgeTones[id].samples[0],
}));

const HELP_ICONS: Record<HelpCard, IconName> = {
  planIt: 'shrink',
  startMode: 'play',
  focusedToday: 'sun',
  roughFirst: 'clock',
  stamps: 'passport',
  nudges: 'bell',
};

/** The Application's questions, Welcome through "Where did you hear about us?": the pages anyone answers, signed out or in. */
export type QuizPage = Extract<ApplicationPage, 'welcome' | 'purpose' | 'hours' | 'style' | 'notBroken' | 'tone' | 'result' | 'help' | 'heardFrom'>;

export const isQuizPage = (page: ApplicationPage): page is QuizPage =>
  ['welcome', 'purpose', 'hours', 'style', 'notBroken', 'tone', 'result', 'help', 'heardFrom'].includes(page);

type Props = {
  page: QuizPage;
  prefs: Partial<Preferences>;
  busy: boolean;
  error: string | null;
  /** Under Welcome's text: the reserved citizen number, once there's a passport. */
  welcomeNote?: ReactNode;
  /** Welcome's buttons: Begin, and Skip (signed in) or Already a citizen? (signed out). */
  welcomeFooter: ReactNode;
  /** Saves one answer, then turns the page. */
  onAnswer: (patch: Partial<Preferences>) => void;
  onHours: (hours: Hours) => void;
  /** The last question: what happens next differs signed out (the passport opens) and in. */
  onHeardFrom: (heardFrom: HeardFrom) => void;
  next: () => void;
  back: () => void;
};

export function QuizPages({ page, prefs, busy, error, welcomeNote, welcomeFooter, onAnswer, onHours, onHeardFrom, next, back }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const backButton = <Button variant="quiet" label={copy.back} onPress={back} disabled={busy} />;
  const continueFooter = (
    <>
      {backButton}
      <Button label={copy.next} onPress={next} disabled={busy} />
    </>
  );

  switch (page) {
    case 'welcome':
      return (
        <ApplicationForm page={page} title={copy.welcomeTitle} lead={copy.welcomeBody} error={error} footer={welcomeFooter}>
          {welcomeNote}
        </ApplicationForm>
      );
    case 'purpose':
      return (
        <ApplicationForm page={page} title={copy.purposeTitle} lead={copy.pickOne} error={error} footer={backButton}>
          <ChoiceCards<Persona>
            label={copy.purposeTitle}
            choices={copy.purposes}
            selected={prefs.persona}
            disabled={busy}
            onPick={(persona) => onAnswer({ persona })}
          />
        </ApplicationForm>
      );
    case 'hours':
      return (
        <ApplicationForm page={page} title={copy.hoursTitle} lead={copy.pickOne} error={error} footer={backButton}>
          <ChoiceCards<Hours> label={copy.hoursTitle} choices={copy.hours} selected={prefs.hours} disabled={busy} onPick={onHours} />
        </ApplicationForm>
      );
    case 'style':
      return (
        <ApplicationForm page={page} title={copy.styleTitle} lead={copy.pickOne} error={error} footer={backButton}>
          <ChoiceCards<ProcrastinationStyle>
            label={copy.styleTitle}
            choices={copy.styles}
            selected={prefs.style}
            disabled={busy}
            onPick={(style) => onAnswer({ style })}
          />
        </ApplicationForm>
      );
    case 'notBroken':
      return (
        <ApplicationForm page={page} title={copy.notBrokenTitle} footer={continueFooter}>
          {copy.notBroken.map((paragraph) => (
            <Text key={paragraph} variant="lead" color={c.inkSoft}>
              {paragraph}
            </Text>
          ))}
          <Text variant="meta" color={c.muted}>
            {copy.notBrokenSource}
          </Text>
        </ApplicationForm>
      );
    case 'tone':
      return (
        <ApplicationForm page={page} title={copy.toneTitle} lead={copy.pickOne} error={error} footer={backButton}>
          <ChoiceCards<NudgeToneId>
            label={copy.toneTitle}
            choices={tones}
            selected={prefs.nudgeTone}
            disabled={busy}
            onPick={(nudgeTone) => onAnswer({ nudgeTone })}
          />
        </ApplicationForm>
      );
    case 'result': {
      const style = prefs.style;
      const answer = copy.styles.find((o) => o.id === style)?.label;
      return (
        <ApplicationForm page={page} title={copy.resultTitle} footer={continueFooter}>
          <Text variant="lead" color={c.inkSoft}>
            {copy.resultFact[resultAudience(prefs.persona)]}
          </Text>
          {style && answer ? (
            <View style={s.yours}>
              <Text variant="section">{copy.resultYours(answer)}</Text>
              <Text variant="body" color={c.inkSoft}>
                {copy.resultWhy[style]}
              </Text>
              <Text variant="body" style={s.fix}>
                {copy.resultFix[style]}
              </Text>
            </View>
          ) : null}
          <Text variant="meta" color={c.muted}>
            {copy.resultSource}
          </Text>
        </ApplicationForm>
      );
    }
    case 'help':
      return (
        <ApplicationForm page={page} title={copy.helpTitle} lead={copy.helpLead} footer={continueFooter}>
          {helpCardsFor(prefs.style).map((card) => {
            const words = copy.helpCards[card];
            const example = card === 'nudges' ? nudgeTones[prefs.nudgeTone ?? 'diplomat'].samples[0] : words.example;
            return (
              <View key={card} style={s.card}>
                <View style={s.cardIcon}>
                  <Icon name={HELP_ICONS[card]} size={20} color={c.primaryText} />
                </View>
                <View style={s.cardText}>
                  <Text variant="item">{words.title}</Text>
                  <Text variant="body" color={c.inkSoft}>
                    {words.body}
                  </Text>
                  {example ? (
                    <Text variant="labelSmall" color={c.muted} style={s.example}>
                      {example}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ApplicationForm>
      );
    case 'heardFrom':
      return (
        <ApplicationForm page={page} title={copy.heardFromTitle} lead={copy.heardFromLead} error={error} footer={backButton}>
          <ChoiceCards<HeardFrom>
            label={copy.heardFromTitle}
            choices={copy.heardFrom}
            selected={prefs.heardFrom}
            disabled={busy}
            onPick={onHeardFrom}
          />
        </ApplicationForm>
      );
  }
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    yours: { gap: 6, paddingVertical: 4 },
    fix: { fontFamily: t.fonts.bodySemibold },
    card: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: t.c.outline,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.card,
    },
    cardIcon: { paddingTop: 2 },
    cardText: { flex: 1, gap: 4 },
    example: { marginTop: 2, letterSpacing: 0.4 },
  }),
});
