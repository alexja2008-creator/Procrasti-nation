import { formatCitizenNumber, mrzMottoLine, mrzNameLine, rankFor, voice } from '@pn/core';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { personName } from '@/auth/person-name';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useUserSettings } from '@/data/user-settings';
import { supabase } from '@/lib/supabase';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.passport;

export default function PassportScreen() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { session } = useAuth();
  const { settings, status } = useUserSettings();

  const name = personName(session?.user);
  const email = session?.user.email ?? '';
  const initials =
    (name.full ?? email)
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?';
  // Starts are counted once Start Mode exists; until then everyone is at the beginning.
  const { next, startsToNext } = rankFor(0);
  const progress = next ? 1 - startsToNext / next.minStarts : 1;

  return (
    <Screen>
      <View style={s.head}>
        <Text variant="label" color={c.muted}>
          {copy.eyebrow.toUpperCase()}
        </Text>
        <Text variant="pageTitle" accessibilityRole="header">
          {voice.passportLead}
        </Text>
      </View>

      <View style={s.idPage} accessibilityLabel="Identity page">
        <View style={s.idHeader}>
          <Text variant="section" style={s.cover}>
            {copy.cover}
          </Text>
          <Icon name="globe" size={24} color={c.ink} strokeWidth={1.5} />
        </View>
        <View style={s.rule} />
        <View style={s.idBody}>
          <View style={s.photo} aria-hidden>
            <Text variant="title" color={c.muted} style={s.initials}>
              {initials}
            </Text>
          </View>
          <View style={s.fields}>
            <Text variant="labelSmall" color={c.muted}>
              {copy.nameLabel.toUpperCase()}
            </Text>
            <Text variant="step" color={name.full ? c.ink : c.muted} style={s.fieldValue}>
              {name.full ?? copy.noName}
            </Text>
            <Text variant="labelSmall" color={c.muted}>
              {copy.statusLabel.toUpperCase()}
            </Text>
            <Text variant="item" color={c.primaryText} style={s.fieldValue}>
              {voice.passportStatus}
            </Text>
            <Text variant="labelSmall" color={c.muted}>
              {copy.citizenLabel.toUpperCase()}
            </Text>
            <Text variant="label" style={s.citizenNo}>
              {settings ? formatCitizenNumber(settings.citizenNumber) : '······'}
            </Text>
          </View>
        </View>
        <View style={s.rule} />
        {settings ? (
          <View aria-hidden>
            <Text variant="label" color={c.inkSoft} style={s.mrz}>
              {mrzNameLine(name.first ?? '', name.last ?? 'Citizen')}
            </Text>
            <Text variant="label" color={c.inkSoft} style={s.mrz}>
              {mrzMottoLine(settings.citizenNumber, new Date(settings.createdAt).getFullYear())}
            </Text>
          </View>
        ) : (
          <Text variant="meta" color={status === 'error' ? c.error : c.muted}>
            {status === 'error' ? copy.loadFailed : ' '}
          </Text>
        )}
      </View>

      <View style={s.stamps}>
        <Text variant="label" color={c.muted} style={s.stampsLabel}>
          {copy.stampsLabel.toUpperCase()}
        </Text>
        <Text variant="body" color={c.inkSoft}>
          {copy.noStamps}
        </Text>
        <Text variant="body" color={c.inkSoft}>
          {voice.encouragement}
        </Text>
        {next ? (
          <View style={s.progress}>
            <View style={s.progressRow}>
              <Text variant="body" style={s.progressLabel}>
                {copy.toNextRank(startsToNext, next.name)}
              </Text>
              <Text variant="labelSmall" color={c.muted}>
                {next.minStarts - startsToNext} / {next.minStarts}
              </Text>
            </View>
            <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: next.minStarts, now: next.minStarts - startsToNext }}>
              <View style={[s.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </View>
        ) : null}
      </View>

      <View style={s.account}>
        {email ? (
          <Text variant="meta" color={c.muted}>
            {voice.signIn.signedInAs(email)}
          </Text>
        ) : null}
        <Button variant="secondary" label={voice.signIn.signOut} onPress={() => supabase.auth.signOut()} />
      </View>
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    head: { gap: 6 },
    idPage: {
      gap: 12,
      paddingVertical: 16,
      paddingHorizontal: 18,
      backgroundColor: t.c.page,
      borderWidth: 1,
      borderColor: t.c.pageBorder,
      borderRadius: t.radii.card,
    },
    idHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cover: { fontFamily: t.fonts.displayItalic, fontSize: 24, lineHeight: 30 },
    rule: { height: 1, backgroundColor: t.c.outline },
    idBody: { flexDirection: 'row', gap: 16 },
    photo: {
      width: 78,
      height: 96,
      borderWidth: 1,
      borderColor: t.c.outline,
      backgroundColor: t.c.chip,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: { fontFamily: t.fonts.displayItalic, fontSize: 30, lineHeight: 36 },
    fields: { flex: 1, gap: 3 },
    fieldValue: { marginBottom: 5 },
    citizenNo: { fontSize: 15, letterSpacing: 2 },
    mrz: { fontSize: 11.5, lineHeight: 19.5, letterSpacing: 0.9 },
    stamps: {
      gap: 10,
      paddingTop: 14,
      paddingBottom: 16,
      paddingHorizontal: 18,
      backgroundColor: t.c.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      borderRadius: t.radii.card,
    },
    stampsLabel: { letterSpacing: 1.5 },
    progress: { gap: 6, marginTop: 2 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    progressLabel: { fontFamily: t.fonts.bodySemibold, flex: 1 },
    track: { height: 6, borderRadius: 3, backgroundColor: t.c.chip, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3, backgroundColor: t.c.primary },
    account: { gap: 10, marginTop: 12, alignItems: 'flex-start' },
  }),
});
