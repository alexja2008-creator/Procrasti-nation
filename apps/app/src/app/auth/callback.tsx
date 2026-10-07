import { voice } from '@pn/core';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { owesPassword } from '@/auth/passport';
import { finishSignIn, friendlyAuthError } from '@/auth/sign-in';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useTokens } from '@/theme/tokens';

const copy = voice.signIn;

/** Landing spot for magic links and OAuth redirects (`…/auth/callback?code=…`). */
export default function AuthCallbackScreen() {
  const t = useTokens();
  const params = useLocalSearchParams();
  const { session, recovering } = useAuth();
  // Which link this is: a newer one can arrive while this screen still shows an older failure.
  const attempt = String(params.code ?? params.error_description ?? params.error ?? '');
  const [failure, setFailure] = useState<{ attempt: string; message: string } | null>(null);
  const error = failure?.attempt === attempt ? failure.message : null;
  // A code can be exchanged only once: handle each link once, even if effects run twice.
  const handled = useRef<string | null>(null);
  // Exchanged: an unsaved passport already has a session, so wait for the link's own.
  const [exchanged, setExchanged] = useState(false);

  useEffect(() => {
    if (handled.current === attempt) return;
    handled.current = attempt;
    finishSignIn(params).then(
      () => setExchanged(true),
      (e) => setFailure({ attempt, message: friendlyAuthError(e) }),
    );
  }, [attempt, params]);

  // An email that just saved their passport: the password that finishes it comes next.
  const [owes, setOwes] = useState<boolean | null>(null);
  useEffect(() => {
    if (session && exchanged) owesPassword(session.user).then(setOwes);
  }, [session, exchanged]);

  // A password-reset link signs them in to choose a new password first.
  if (session && recovering) return <Redirect href="/auth/new-password" />;
  // Already signed in and the link was stale: carry on where they were.
  if (session && error) return <Redirect href="/" />;
  if (session && exchanged && owes !== null) return <Redirect href={owes ? { pathname: '/auth/new-password', params: { for: 'save' } } : '/'} />;

  return (
    <Screen>
      <View style={styles.column}>
        {error ? (
          <>
            <Text variant="pageTitle" accessibilityRole="header">
              {copy.callbackFailedTitle}
            </Text>
            <Text variant="lead" color={t.c.inkSoft}>
              {error}
            </Text>
            <Button label={copy.backToSignIn} onPress={() => router.replace('/sign-in')} />
          </>
        ) : (
          <View style={styles.checking} accessibilityLiveRegion="polite">
            <ActivityIndicator color={t.c.primary} />
            <Text variant="label" color={t.c.muted}>
              {copy.checking.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 14, paddingTop: 40 },
  checking: { alignItems: 'center', gap: 12, paddingTop: 80 },
});
