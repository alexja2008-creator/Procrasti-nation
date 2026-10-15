import { voice } from '@pn/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { SavePassport } from '@/components/save-passport';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { usePassportStatus } from '@/hooks/use-passport-status';
import { useResendSaveLink } from '@/hooks/use-resend-save-link';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.application;

/**
 * On Today and Passport until it's saved: save it (a sheet); with a link out, check your email
 * (send it again, or use a different address); once it's opened, choose the password that finishes
 * saving it. It can't be dismissed (Alex, 2026-10-15): an unsaved passport lives in one browser or phone.
 */
export function PassportSaveCard() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { session } = useAuth();
  const { unsaved, pendingEmail, owesPassword } = usePassportStatus();
  const again = useResendSaveLink(session?.user);
  // Which sheet, fixed when it opens: a link sent from it mustn't retitle it mid-way.
  const [sheet, setSheet] = useState<'save' | 'change' | null>(null);

  if (!unsaved && !owesPassword) return null;

  const title = owesPassword ? copy.choosePasswordTitle : pendingEmail ? copy.checkEmailTitle : copy.unsavedTitle;
  const body = owesPassword ? copy.choosePasswordBody : pendingEmail ? copy.checkEmailBody(pendingEmail) : copy.unsavedBody;

  return (
    <View style={s.card}>
      <Text variant="item">{title}</Text>
      <Text variant="body" color={c.inkSoft}>
        {body}
      </Text>
      {pendingEmail && (again.error || again.sentAgain) ? (
        <Text variant="meta" color={again.error ? c.error : c.muted} accessibilityLiveRegion="polite">
          {again.error ?? copy.sentAgain}
        </Text>
      ) : null}
      <View style={s.action}>
        {owesPassword ? (
          <Button
            variant="secondary"
            label={copy.choosePasswordTitle}
            onPress={() => router.push({ pathname: '/auth/new-password', params: { for: 'save' } })}
          />
        ) : pendingEmail ? (
          <>
            <Button
              variant="secondary"
              label={again.secondsLeft > 0 ? voice.signIn.resendIn(again.secondsLeft) : copy.sendAgain}
              disabled={again.busy || again.secondsLeft > 0}
              onPress={again.resend}
            />
            <View style={s.quiet}>
              <Button variant="quiet" label={copy.differentEmail} onPress={() => setSheet('change')} />
            </View>
          </>
        ) : (
          <Button variant="secondary" label={copy.saveAction} onPress={() => setSheet('save')} />
        )}
      </View>
      {sheet ? (
        <Sheet title={sheet === 'change' ? copy.differentEmail : copy.saveAction} onClose={() => setSheet(null)} width={440}>
          <View style={s.sheet}>
            <Text variant="meta" color={c.muted}>
              {copy.saveLead}
            </Text>
            {/* A different email starts at the form, not "Check your email" again. */}
            <SavePassport changeEmail={sheet === 'change'} onDone={() => setSheet(null)} />
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    card: {
      gap: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: t.c.primary,
      borderRadius: t.radii.card,
      backgroundColor: t.c.card,
    },
    // Stacked: side by side they wrap unevenly on a phone.
    action: { alignItems: 'flex-start', gap: 4, marginTop: 2 },
    quiet: { marginLeft: -8 },
    sheet: { gap: 12, paddingVertical: 8 },
  }),
});
