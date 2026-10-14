import { isLongEnoughPassword, MIN_PASSWORD_LENGTH, voice } from '@pn/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { settlePassword } from '@/auth/passport';
import { friendlyAuthError, setPassword } from '@/auth/sign-in';
import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { PasswordField } from '@/components/password-field';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.signIn;

/**
 * After a password-reset link: they're signed in, and choose the password they'll use from now on.
 * `for=save`: their email just confirmed saving their passport, and this finishes it.
 */
export default function NewPasswordScreen() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { session, finishRecovery } = useAuth();
  const saving = useLocalSearchParams<{ for?: string }>().for === 'save';
  const [password, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = () => {
    finishRecovery();
    router.replace('/');
  };

  const save = async () => {
    if (!isLongEnoughPassword(password)) {
      setError(voice.authErrors.tooShort(MIN_PASSWORD_LENGTH));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await setPassword(password);
      if (session) await settlePassword(session.user.id);
      leave();
    } catch (e) {
      setError(friendlyAuthError(e, voice.settings.passwordFailed));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={s.column}>
        <Logo />
        <View style={s.head}>
          <Text variant="label" color={c.muted}>
            {copy.eyebrow.toUpperCase()}
          </Text>
          <Text variant="title" accessibilityRole="header">
            {saving ? voice.application.choosePasswordTitle : copy.newPasswordTitle}
          </Text>
          <Text variant="lead" color={c.muted}>
            {saving ? voice.application.choosePasswordBody : copy.newPasswordLead}
          </Text>
        </View>
        <View style={s.page}>
          <Text variant="labelSmall" color={c.muted} aria-hidden>
            {copy.passwordLabel.toUpperCase()}
          </Text>
          <PasswordField
            value={password}
            onChangeText={setValue}
            label={copy.passwordLabelSpoken}
            isNew
            autoFocus
            returnKeyType="done"
            onSubmitEditing={save}
            editable={!busy}
          />
          <Text variant="meta" color={c.muted}>
            {copy.newPasswordHint(MIN_PASSWORD_LENGTH)}
          </Text>
          {error ? (
            <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button label={busy ? voice.settings.savingPassword : voice.settings.savePassword} disabled={busy} onPress={save} />
          <View style={s.quiet}>
            <Button variant="quiet" label={copy.notNow} disabled={busy} onPress={leave} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    column: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 22, paddingTop: 8 },
    head: { gap: 8 },
    page: {
      gap: 10,
      padding: 18,
      backgroundColor: t.c.page,
      borderWidth: 1,
      borderColor: t.c.pageBorder,
      borderRadius: t.radii.card,
    },
    quiet: { alignItems: 'flex-start', marginLeft: -8 },
  }),
});
