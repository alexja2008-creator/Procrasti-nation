import { authErrorKind, formatPhone, isValidUsername, normalizePhone, voice } from '@pn/core';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { confirmSaveCode, sendSaveCode, sendSaveLink } from '@/auth/passport';
import { enabledMethods, friendlyAuthError, isValidEmail } from '@/auth/sign-in';
import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { UsernameField } from '@/components/username-field';
import { isUsernameTaken, saveUsername } from '@/data/profile';
import { useUsernameCheck } from '@/hooks/use-username-check';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.application;
const signIn = voice.signIn;
/** Texted codes wait for a paid Twilio account (EXPO_PUBLIC_AUTH_PROVIDERS includes `phone`). */
const PHONE = enabledMethods.has('phone');

type Step = { kind: 'form' } | { kind: 'code'; phone: string } | { kind: 'emailSent'; email: string } | { kind: 'saved'; phone: string };

type Props = {
  /** Saved, or the email link sent: carry on (the Application finishes; a sheet closes). */
  onDone: () => void;
  /** "Later": not now (the Application only). */
  onLater?: () => void;
};

/**
 * Save your passport: a username, then a texted code (the quick way) or an email + password.
 * Keeps the same account, so everything in the anonymous passport stays.
 */
export function SavePassport({ onDone, onLater }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { session } = useAuth();
  const userId = session?.user.id;
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [method, setMethod] = useState<'phone' | 'email'>(PHONE ? 'phone' : 'email');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usernameStatus = useUsernameCheck(step.kind === 'form' ? username : '');

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
  const rateLimitedOr = (fallback: string) => (e: unknown) =>
    authErrorKind(e instanceof Error ? e : null) === 'rateLimited' ? voice.authErrors.rateLimited : fallback;

  /** Checks the username is still free (the hint may be a moment old). */
  const usernameReady = async () => {
    if (!isValidUsername(username)) {
      setError(signIn.usernameHint);
      return false;
    }
    if (await isUsernameTaken(username, userId).catch(() => false)) {
      setError(signIn.usernameTaken(username));
      return false;
    }
    return true;
  };

  const textCode = () => {
    const e164 = normalizePhone(phone);
    if (!e164) return setError(copy.invalidPhone);
    return run(async () => {
      if (!(await usernameReady())) return;
      await sendSaveCode(e164);
      setCode('');
      setStep({ kind: 'code', phone: e164 });
    }, rateLimitedOr(copy.codeFailed));
  };

  const confirm = (e164: string) =>
    run(async () => {
      await confirmSaveCode(e164, code.trim());
      // Saved (no longer anonymous), so the public username can be claimed now. One taken in the
      // meantime can be chosen again in Settings.
      if (userId) await saveUsername(userId, username).catch(() => undefined);
      setStep({ kind: 'saved', phone: e164 });
    }, rateLimitedOr(copy.wrongCode));

  const sendLink = () => {
    const address = email.trim();
    if (!isValidEmail(address)) return setError(signIn.invalidEmail);
    return run(async () => {
      if (!userId || !(await usernameReady())) return;
      await sendSaveLink(userId, address, username);
      setStep({ kind: 'emailSent', email: address });
    }, (e) => friendlyAuthError(e, copy.saveFailed));
  };

  const errorText = error ? (
    <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
      {error}
    </Text>
  ) : null;
  const label = (text: string) => (
    <Text variant="labelSmall" color={c.muted} aria-hidden style={s.label}>
      {text.toUpperCase()}
    </Text>
  );

  if (step.kind === 'saved' || step.kind === 'emailSent') {
    return (
      <View style={s.column} accessibilityLiveRegion="polite">
        <Text variant="body" color={c.inkSoft}>
          {step.kind === 'saved' ? copy.savedPhone(formatPhone(step.phone)) : copy.emailSent(step.email)}
        </Text>
        <Button label={copy.next} onPress={onDone} />
      </View>
    );
  }

  if (step.kind === 'code') {
    return (
      <View style={s.column}>
        <Text variant="body" color={c.inkSoft}>
          {copy.codeSent(formatPhone(step.phone))}
        </Text>
        {label(copy.codeLabel)}
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus
          maxLength={8}
          editable={!busy}
          accessibilityLabel={copy.codeLabel}
          returnKeyType="done"
          onSubmitEditing={() => confirm(step.phone)}
          style={[s.input, s.code]}
        />
        {errorText}
        <Button label={busy ? copy.savingPassport : copy.confirmCode} disabled={busy || code.length < 6} onPress={() => confirm(step.phone)} />
        <View style={s.quiet}>
          <Button variant="quiet" label={copy.newCode} disabled={busy} onPress={textCode} />
          <Button variant="quiet" label={copy.differentNumber} disabled={busy} onPress={() => setStep({ kind: 'form' })} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.column}>
      {label(signIn.usernameLabel)}
      <UsernameField value={username} onChange={setUsername} status={usernameStatus} returnKeyType="next" editable={!busy} />
      {method === 'phone' ? (
        <>
          {label(copy.phoneLabel)}
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={copy.phonePlaceholder}
            placeholderTextColor={c.muted}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            editable={!busy}
            accessibilityLabel={copy.phoneLabelSpoken}
            returnKeyType="send"
            onSubmitEditing={textCode}
            style={s.input}
          />
          <Text variant="meta" color={c.muted}>
            {copy.phoneHint}
          </Text>
        </>
      ) : (
        <>
          {label(signIn.emailLabel)}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={signIn.emailPlaceholder}
            placeholderTextColor={c.muted}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            accessibilityLabel={signIn.emailLabelSpoken}
            returnKeyType="send"
            onSubmitEditing={sendLink}
            style={s.input}
          />
        </>
      )}
      {errorText}
      {method === 'phone' ? (
        <Button label={busy ? copy.sendingCode : copy.textMeACode} disabled={busy} onPress={textCode} />
      ) : (
        <Button label={busy ? signIn.sending : copy.sendEmailLink} disabled={busy} onPress={sendLink} />
      )}
      <View style={s.quiet}>
        {PHONE ? (
          <Button
            variant="quiet"
            label={method === 'phone' ? copy.useEmail : copy.usePhone}
            disabled={busy}
            onPress={() => {
              setMethod(method === 'phone' ? 'email' : 'phone');
              setError(null);
            }}
          />
        ) : null}
        {onLater ? <Button variant="quiet" label={copy.later} disabled={busy} onPress={onLater} /> : null}
      </View>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    column: { gap: 10 },
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
    quiet: { alignItems: 'flex-start', marginLeft: -8 },
  }),
});
