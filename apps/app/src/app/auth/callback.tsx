import { voice } from '@pn/core';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
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
  const { session } = useAuth();
  // Which link this is: a newer one can arrive while this screen still shows an older failure.
  const attempt = String(params.code ?? params.error_description ?? params.error ?? '');
  const [failure, setFailure] = useState<{ attempt: string; message: string } | null>(null);
  const error = failure?.attempt === attempt ? failure.message : null;
  // A code can be exchanged only once: handle each link once, even if effects run twice.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (handled.current === attempt) return;
    handled.current = attempt;
    finishSignIn(params).catch((e) => setFailure({ attempt, message: friendlyAuthError(e) }));
  }, [attempt, params]);

  if (session) return <Redirect href="/" />;

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
