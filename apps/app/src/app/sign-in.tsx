import { voice } from '@pn/core';
import { useEffect, useState } from 'react';
import { StyleSheet, Text as RNText, TextInput, View } from 'react-native';

import { isAppleSignInAvailable, signInWithApple } from '@/auth/apple';
import { enabledMethods, friendlyAuthError, isValidEmail, sendMagicLink, signInWithGoogle } from '@/auth/sign-in';
import { AppleButton } from '@/components/apple-button';
import { GoogleMark } from '@/components/brand-marks';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Logo } from '@/components/logo';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.signIn;
/** Supabase allows one magic link per address per minute. */
const RESEND_SECONDS = 60;

export default function SignInScreen() {
  const s = useStyles(makeStyles);
  const { c, fonts } = s.t;

  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [appleAvailable, setAppleAvailable] = useState(false);

  const showEmail = enabledMethods.has('email');
  const showApple = enabledMethods.has('apple') && appleAvailable;
  const showGoogle = enabledMethods.has('google');
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    if (enabledMethods.has('apple')) isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  // Tick the resend countdown once a second until it runs out.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= resendAt) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [resendAt]);

  const send = async (address: string) => {
    if (!isValidEmail(address)) {
      setError(copy.invalidEmail);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await sendMagicLink(address);
      setSentTo(address);
      setResendAt(Date.now() + RESEND_SECONDS * 1000);
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  // On success the session changes and the root layout swaps this screen for Today.
  const social = (signIn: () => Promise<boolean>) => async () => {
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(friendlyAuthError(e));
    }
  };

  const errorText = error ? (
    <Text variant="meta" color={c.error} accessibilityLiveRegion="polite" style={s.error}>
      {error}
    </Text>
  ) : null;

  return (
    <Screen>
      <View style={s.column}>
        <Logo />

        <View style={s.head}>
          <Text variant="label" color={c.muted}>
            {copy.eyebrow.toUpperCase()}
          </Text>
          <Text variant="title" accessibilityRole="header">
            {copy.titleLead}{' '}
            <RNText style={{ fontFamily: fonts.displayItalic, color: c.primary }}>{copy.titleAccent}</RNText>
          </Text>
          <Text variant="lead" color={c.muted}>
            {copy.lead}
          </Text>
        </View>

        <View style={s.page}>
          {sentTo ? (
            <View style={s.sent} accessibilityLiveRegion="polite">
              <Icon name="mail" size={28} color={c.primary} />
              <Text variant="section" accessibilityRole="header">
                {copy.sentTitle}
              </Text>
              <Text variant="body" color={c.inkSoft}>
                {copy.sentBody(sentTo)}
              </Text>
              {errorText}
              <View style={s.sentActions}>
                <Button
                  variant="quiet"
                  label={secondsLeft > 0 ? copy.resendIn(secondsLeft) : copy.resend}
                  disabled={busy || secondsLeft > 0}
                  onPress={() => send(sentTo)}
                />
                <Button
                  variant="quiet"
                  label={copy.differentEmail}
                  onPress={() => {
                    setSentTo(null);
                    setError(null);
                  }}
                />
              </View>
            </View>
          ) : (
            <>
              {showApple ? <AppleButton onPress={social(signInWithApple)} /> : null}
              {showGoogle ? (
                <Button
                  variant="secondary"
                  icon={<GoogleMark />}
                  label={copy.continueWithGoogle}
                  onPress={social(signInWithGoogle)}
                />
              ) : null}
              {(showApple || showGoogle) && showEmail ? (
                <View style={s.divider} aria-hidden>
                  <View style={s.rule} />
                  <Text variant="labelSmall" color={c.muted}>
                    OR
                  </Text>
                  <View style={s.rule} />
                </View>
              ) : null}
              {showEmail ? (
                <View style={s.emailBlock}>
                  <Text variant="labelSmall" color={c.muted} aria-hidden>
                    {copy.emailLabel.toUpperCase()}
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onSubmitEditing={() => send(email.trim())}
                    placeholder={copy.emailPlaceholder}
                    placeholderTextColor={c.muted}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    editable={!busy}
                    accessibilityLabel={copy.emailLabelSpoken}
                    style={[s.input, focused && s.inputFocused]}
                  />
                  {errorText}
                  <Button label={busy ? copy.sending : copy.sendLink} disabled={busy} onPress={() => send(email.trim())} />
                  <Text variant="meta" color={c.muted}>
                    {copy.hint}
                  </Text>
                </View>
              ) : (
                errorText
              )}
            </>
          )}
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
      gap: 12,
      padding: 18,
      backgroundColor: t.c.page,
      borderWidth: 1,
      borderColor: t.c.pageBorder,
      borderRadius: t.radii.card,
    },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
    rule: { flex: 1, height: 1, backgroundColor: t.c.rule },
    emailBlock: { gap: 10 },
    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
      color: t.c.ink,
      fontFamily: t.fonts.body,
      // 16px keeps mobile Safari from zooming into the field.
      fontSize: 16,
    },
    inputFocused: { borderColor: t.c.primary, borderWidth: 1.5 },
    error: { fontSize: 13.5 },
    sent: { gap: 10, alignItems: 'flex-start' },
    sentActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginLeft: -8 },
  }),
});
