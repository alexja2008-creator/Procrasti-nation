import { authErrorKind, formatPhone, isServerFailure, isValidUsername, normalizePhone, voice } from '@pn/core';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { confirmSaveCode, pendingEmail, sendSaveCode, sendSaveLink } from '@/auth/passport';
import { enabledMethods, friendlyAuthError, isValidEmail } from '@/auth/sign-in';
import { signOut } from '@/auth/sign-out';
import { Button } from '@/components/button';
import { SentPanel } from '@/components/sign-in/sent-panel';
import { Text } from '@/components/text';
import { UsernameField } from '@/components/username-field';
import { isUsernameTaken, saveUsername } from '@/data/profile';
import { useResendSaveLink } from '@/hooks/use-resend-save-link';
import { useUsernameCheck } from '@/hooks/use-username-check';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.application;
const signIn = voice.signIn;
/** Texted codes wait for a paid Twilio account (EXPO_PUBLIC_AUTH_PROVIDERS includes `phone`). */
const PHONE = enabledMethods.has('phone');

type Step =
  | { kind: 'form' }
  | { kind: 'code'; phone: string }
  | { kind: 'emailSent'; email: string }
  | { kind: 'saved'; phone: string }
  /** A link is out and not opened yet: send it again, or use a different email. */
  | { kind: 'waiting'; email: string }
  /** The link or code couldn't be sent on our side: they carry on, and it's asked again next time. */
  | { kind: 'deferred' }
  /** Their email already has a passport: leave this unsaved one to sign in to that one. */
  | { kind: 'leave' };

type Props = {
  /** Saved, the email link sent, or let in when sending failed: carry on (the Application finishes; a sheet closes). */
  onDone: () => void;
  /** Start at the form even with a link out ("Use a different email"). */
  changeEmail?: boolean;
};

/**
 * Save your passport: a username, then a texted code (the quick way) or an email + password.
 * Keeps the same account, so everything in the anonymous passport stays. There's no Later: the
 * Application can't finish without it (`DECISIONS.md`).
 */
export function SavePassport({ onDone, changeEmail = false }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { session } = useAuth();
  const userId = session?.user.id;
  const [step, setStep] = useState<Step>(() => {
    const waiting = pendingEmail(session?.user);
    return waiting && !changeEmail ? { kind: 'waiting', email: waiting } : { kind: 'form' };
  });
  const [method, setMethod] = useState<'phone' | 'email'>(PHONE && !changeEmail ? 'phone' : 'email');
  // A different email keeps the username already waiting for the link.
  const [username, setUsername] = useState(() => {
    const waiting = session?.user.user_metadata?.pending_username;
    return typeof waiting === 'string' ? waiting : '';
  });
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The email already has a passport: offer to sign in to it instead.
  const [emailTaken, setEmailTaken] = useState(false);
  const usernameStatus = useUsernameCheck(step.kind === 'form' ? username : '');
  const again = useResendSaveLink(session?.user);

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

  /** Sends; when it fails on our side (not theirs), they carry on instead (Continue lets them in). False if so. */
  const sendOrDefer = async (send: () => Promise<void>) => {
    try {
      await send();
      return true;
    } catch (e) {
      if (!isServerFailure(e as { status?: unknown })) throw e;
      setStep({ kind: 'deferred' });
      return false;
    }
  };

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
      if (!(await sendOrDefer(() => sendSaveCode(e164)))) return;
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
    setEmailTaken(false);
    return run(async () => {
      if (!userId || !(await usernameReady())) return;
      if (!(await sendOrDefer(() => sendSaveLink(userId, address, username)))) return;
      setStep({ kind: 'emailSent', email: address });
    }, (e) => {
      setEmailTaken(authErrorKind(e instanceof Error ? e : null) === 'accountExists');
      return friendlyAuthError(e, copy.saveFailed);
    });
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

  if (step.kind === 'saved' || step.kind === 'emailSent' || step.kind === 'deferred') {
    return (
      <View style={s.column} accessibilityLiveRegion="polite">
        <Text variant="body" color={c.inkSoft}>
          {step.kind === 'saved' ? copy.savedPhone(formatPhone(step.phone)) : step.kind === 'emailSent' ? copy.emailSent(step.email) : copy.sendLater}
        </Text>
        <Button label={copy.next} onPress={onDone} />
      </View>
    );
  }

  if (step.kind === 'waiting' && !session?.user.is_anonymous) {
    // Opened meanwhile (another tab syncs the saved session here): nothing is waiting any more.
    return (
      <View style={s.column} accessibilityLiveRegion="polite">
        <Text variant="body" color={c.inkSoft}>
          {copy.emailConfirmed}
        </Text>
        <Button label={copy.next} onPress={onDone} />
      </View>
    );
  }

  if (step.kind === 'waiting') {
    return (
      <SentPanel
        body={copy.checkEmailBody(step.email)}
        aside={again.sentAgain ? copy.sentAgain : undefined}
        error={
          again.error ? (
            <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
              {again.error}
            </Text>
          ) : null
        }
        secondsLeft={again.secondsLeft}
        busy={again.busy}
        onResend={again.resend}
        resendLabel={copy.sendAgain}
        backLabel={copy.differentEmail}
        onBack={() => {
          setMethod('email');
          setStep({ kind: 'form' });
        }}
      />
    );
  }

  if (step.kind === 'leave') {
    return (
      <View style={s.column} accessibilityLiveRegion="polite">
        <Text variant="body" color={c.inkSoft}>
          {copy.signInInsteadBody}
        </Text>
        {errorText}
        <Button
          label={copy.signOutToSignIn}
          disabled={busy}
          onPress={() => run(signOut, () => voice.authErrors.offline)}
        />
        <View style={s.quiet}>
          <Button variant="quiet" label={copy.keepThisOne} disabled={busy} onPress={() => setStep({ kind: 'form' })} />
        </View>
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
            onChangeText={(text) => {
              setEmail(text);
              setEmailTaken(false);
            }}
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
        <Button
          label={busy ? signIn.sending : again.secondsLeft > 0 ? copy.sendIn(again.secondsLeft) : copy.sendEmailLink}
          disabled={busy || again.secondsLeft > 0}
          onPress={sendLink}
        />
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
        {emailTaken && method === 'email' ? (
          <Button
            variant="quiet"
            label={copy.signInInstead}
            disabled={busy}
            onPress={() => {
              setError(null);
              setStep({ kind: 'leave' });
            }}
          />
        ) : null}
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
