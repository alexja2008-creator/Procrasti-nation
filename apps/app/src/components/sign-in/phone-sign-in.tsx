import { authErrorKind, formatPhone, normalizePhone, voice } from '@pn/core';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { sendSignInCode, signInWithCode } from '@/auth/passport';
import { friendlyAuthError } from '@/auth/sign-in';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.signIn;
const passport = voice.application;
/** Supabase allows one text per number per minute. */
const RESEND_SECONDS = 60;

/** Sign in with a texted code (US and Canada): the number, then the code it gets. */
export function PhoneSignIn() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  /** The number a code went to (+1…), once one did. */
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  // Tick the resend countdown once a second until it runs out.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= resendAt) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [resendAt]);

  const run = async (work: () => Promise<void>, failed: (e: unknown) => string) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(failed(e));
    } finally {
      setBusy(false);
    }
  };

  const textCode = () => {
    const e164 = normalizePhone(phone);
    if (!e164) return setError(passport.invalidPhone);
    return run(async () => {
      await sendSignInCode(e164);
      setCode('');
      setCodeFor(e164);
      setResendAt(Date.now() + RESEND_SECONDS * 1000);
    }, (e) => friendlyAuthError(e, passport.codeFailed));
  };

  // On success the session changes and the root layout swaps this screen for Today.
  const confirm = (e164: string) =>
    run(
      () => signInWithCode(e164, code.trim()),
      (e) => (authErrorKind(e instanceof Error ? e : null) === 'rateLimited' ? voice.authErrors.rateLimited : passport.wrongCode),
    );

  const errorText = error ? (
    <Text variant="meta" color={c.error} accessibilityLiveRegion="polite" style={s.error}>
      {error}
    </Text>
  ) : null;
  const label = (text: string) => (
    <Text variant="labelSmall" color={c.muted} aria-hidden style={s.label}>
      {text.toUpperCase()}
    </Text>
  );

  if (codeFor) {
    return (
      <>
        <Text variant="body" color={c.inkSoft}>
          {copy.phoneSentBody(formatPhone(codeFor))}
        </Text>
        {label(passport.codeLabel)}
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus
          maxLength={8}
          editable={!busy}
          accessibilityLabel={passport.codeLabel}
          returnKeyType="go"
          onSubmitEditing={() => confirm(codeFor)}
          style={[s.input, s.code]}
        />
        {errorText}
        <Button label={busy ? copy.signingIn : copy.signIn} disabled={busy || code.length < 6} onPress={() => confirm(codeFor)} />
        <View style={s.quiet}>
          <Button
            variant="quiet"
            label={secondsLeft > 0 ? copy.resendIn(secondsLeft) : passport.newCode}
            disabled={busy || secondsLeft > 0}
            onPress={textCode}
          />
          <Button variant="quiet" label={passport.differentNumber} disabled={busy} onPress={() => setCodeFor(null)} />
        </View>
      </>
    );
  }

  return (
    <>
      {label(passport.phoneLabel)}
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder={passport.phonePlaceholder}
        placeholderTextColor={c.muted}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        editable={!busy}
        accessibilityLabel={passport.phoneLabelSpoken}
        returnKeyType="send"
        onSubmitEditing={textCode}
        style={s.input}
      />
      {errorText}
      <Button label={busy ? passport.sendingCode : passport.textMeACode} disabled={busy} onPress={textCode} />
    </>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    label: { marginTop: 4 },
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
    code: { fontFamily: t.fonts.mono, fontSize: 22, letterSpacing: 6 },
    error: { fontSize: 13.5 },
    quiet: { alignItems: 'flex-start', marginLeft: -8, marginTop: -6 },
  }),
});
