import { authErrorKind, isLongEnoughPassword, isValidUsername, MIN_PASSWORD_LENGTH, voice } from '@pn/core';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text as RNText, TextInput, View } from 'react-native';

import { isAppleSignInAvailable, signInWithApple } from '@/auth/apple';
import {
  createAccount,
  enabledMethods,
  friendlyAuthError,
  isValidEmail,
  resendConfirmation,
  sendMagicLink,
  sendPasswordReset,
  signInWithGoogle,
  signInWithPassword,
} from '@/auth/sign-in';
import { AppleButton } from '@/components/apple-button';
import { GoogleMark } from '@/components/brand-marks';
import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { PasswordField } from '@/components/password-field';
import { Screen } from '@/components/screen';
import { SentPanel } from '@/components/sign-in/sent-panel';
import { Text } from '@/components/text';
import { UsernameField } from '@/components/username-field';
import { isUsernameTaken } from '@/data/profile';
import { useUsernameCheck } from '@/hooks/use-username-check';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.signIn;
/** Supabase allows one email per address per minute. */
const RESEND_SECONDS = 60;

/** What was emailed: a sign-in link, a sign-up confirmation, or a password reset. */
type Sent = 'link' | 'confirm' | 'reset';
const SEND: Record<Sent, (email: string) => Promise<void>> = {
  link: sendMagicLink,
  confirm: resendConfirmation,
  reset: sendPasswordReset,
};

export default function SignInScreen() {
  const s = useStyles(makeStyles);
  const { c, fonts } = s.t;

  // A password is the way in; a magic link is one tap away; new people create an account.
  const [mode, setMode] = useState<'password' | 'link' | 'create'>('password');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Signing in before confirming: offer the confirmation again.
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [sent, setSent] = useState<{ kind: Sent; email: string } | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [appleAvailable, setAppleAvailable] = useState(false);
  const usernameStatus = useUsernameCheck(mode === 'create' ? username : '');

  const creating = mode === 'create';
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

  /** Runs one request with the form busy; a failure shows as the error line. */
  const attempt = async (work: () => Promise<void>) => {
    setError(null);
    setUnconfirmed(false);
    setBusy(true);
    try {
      await work();
    } catch (e) {
      setError(friendlyAuthError(e));
      setUnconfirmed(authErrorKind(e instanceof Error ? e : null) === 'unconfirmed');
    } finally {
      setBusy(false);
    }
  };

  const emailed = (kind: Sent, address: string) => {
    setSent({ kind, email: address });
    setResendAt(Date.now() + RESEND_SECONDS * 1000);
  };

  /** Validates the address, then emails a link of that kind. */
  const send = (kind: Sent, address: string) => {
    if (!isValidEmail(address)) {
      setError(kind === 'reset' ? copy.forgotNeedsEmail : copy.invalidEmail);
      return;
    }
    return attempt(async () => {
      await SEND[kind](address);
      emailed(kind, address);
    });
  };

  // On success the session changes and the root layout swaps this screen for the Application or Today.
  const signIn = () => {
    const address = email.trim();
    if (!isValidEmail(address)) return setError(copy.invalidEmail);
    if (!password) return setError(copy.needPassword);
    return attempt(() => signInWithPassword(address, password));
  };

  const create = () => {
    const address = email.trim();
    if (!isValidUsername(username)) return setError(copy.usernameHint);
    if (!isValidEmail(address)) return setError(copy.invalidEmail);
    if (!isLongEnoughPassword(password)) return setError(voice.authErrors.tooShort(MIN_PASSWORD_LENGTH));
    return attempt(async () => {
      // Checked again here: the hint under the field may be a moment old.
      if (await isUsernameTaken(username).catch(() => false)) {
        setError(copy.usernameTaken(username));
        return;
      }
      const signedIn = await createAccount({ email: address, password, username });
      if (!signedIn) emailed('confirm', address);
    });
  };

  const switchTo = (next: typeof mode) => {
    setMode(next);
    setError(null);
    setUnconfirmed(false);
  };

  // On success the session changes and the root layout swaps this screen for Today.
  const social = (signInWith: () => Promise<boolean>) => () => attempt(async () => void (await signInWith()));

  const errorText = error ? (
    <Text variant="meta" color={c.error} accessibilityLiveRegion="polite" style={s.error}>
      {error}
    </Text>
  ) : null;

  const fieldLabel = (label: string) => (
    <Text variant="labelSmall" color={c.muted} aria-hidden style={s.fieldLabel}>
      {label.toUpperCase()}
    </Text>
  );

  return (
    <Screen>
      <View style={s.column}>
        <Logo />

        <View style={s.head}>
          <Text variant="label" color={c.muted}>
            {copy.eyebrow.toUpperCase()}
          </Text>
          <Text variant="title" accessibilityRole="header">
            {creating ? copy.createTitleLead : copy.titleLead}{' '}
            <RNText style={{ fontFamily: fonts.displayItalic, color: c.primary }}>
              {creating ? copy.createTitleAccent : copy.titleAccent}
            </RNText>
          </Text>
          <Text variant="lead" color={c.muted}>
            {creating ? copy.createLead : copy.lead}
          </Text>
        </View>

        <View style={s.page}>
          {sent ? (
            <SentPanel
              body={
                sent.kind === 'confirm'
                  ? copy.confirmBody(sent.email)
                  : sent.kind === 'reset'
                    ? copy.resetBody(sent.email)
                    : copy.sentBody(sent.email)
              }
              aside={sent.kind === 'confirm' ? copy.confirmAlready : undefined}
              error={errorText}
              secondsLeft={secondsLeft}
              busy={busy}
              onResend={() => send(sent.kind, sent.email)}
              resendLabel={sent.kind === 'confirm' ? copy.resendConfirm : undefined}
              backLabel={sent.kind === 'link' ? copy.differentEmail : copy.backToSignIn}
              onBack={() => {
                if (sent.kind !== 'link') switchTo('password');
                setSent(null);
                setError(null);
              }}
            />
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
                  {creating ? (
                    <>
                      {fieldLabel(copy.usernameLabel)}
                      <UsernameField
                        value={username}
                        onChange={setUsername}
                        status={usernameStatus}
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => emailRef.current?.focus()}
                        editable={!busy}
                      />
                    </>
                  ) : null}
                  {fieldLabel(copy.emailLabel)}
                  <TextInput
                    ref={emailRef}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onSubmitEditing={mode === 'link' ? () => send('link', email.trim()) : () => passwordRef.current?.focus()}
                    submitBehavior={mode === 'link' ? 'blurAndSubmit' : 'submit'}
                    placeholder={copy.emailPlaceholder}
                    placeholderTextColor={c.muted}
                    keyboardType="email-address"
                    // "username" pairs it with the password for iOS AutoFill (they sign in with the email).
                    textContentType="username"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType={mode === 'link' ? 'send' : 'next'}
                    editable={!busy}
                    accessibilityLabel={copy.emailLabelSpoken}
                    style={[s.input, focused && s.inputFocused]}
                  />
                  {mode !== 'link' ? (
                    <>
                      {fieldLabel(copy.passwordLabel)}
                      <PasswordField
                        ref={passwordRef}
                        value={password}
                        onChangeText={setPassword}
                        label={copy.passwordLabelSpoken}
                        isNew={creating}
                        onSubmitEditing={creating ? create : signIn}
                        returnKeyType="go"
                        editable={!busy}
                      />
                      {creating ? (
                        <Text variant="meta" color={c.muted}>
                          {copy.newPasswordHint(MIN_PASSWORD_LENGTH)}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                  {errorText}
                  {creating ? (
                    <Button label={busy ? copy.creating : copy.createAccount} disabled={busy} onPress={create} />
                  ) : mode === 'password' ? (
                    <Button label={busy ? copy.signingIn : copy.signIn} disabled={busy} onPress={signIn} />
                  ) : (
                    <>
                      <Button label={busy ? copy.sending : copy.sendLink} disabled={busy} onPress={() => send('link', email.trim())} />
                      <Text variant="meta" color={c.muted}>
                        {copy.hint}
                      </Text>
                    </>
                  )}
                  {!creating ? (
                    <View style={s.quietLinks}>
                      {unconfirmed ? (
                        <Button variant="quiet" label={copy.resendConfirm} disabled={busy} onPress={() => send('confirm', email.trim())} />
                      ) : null}
                      {mode === 'password' ? (
                        <Button variant="quiet" label={copy.forgot} disabled={busy} onPress={() => send('reset', email.trim())} />
                      ) : null}
                      <Button
                        variant="quiet"
                        label={mode === 'password' ? copy.useLink : copy.usePassword}
                        disabled={busy}
                        onPress={() => switchTo(mode === 'password' ? 'link' : 'password')}
                      />
                    </View>
                  ) : null}
                </View>
              ) : (
                errorText
              )}
            </>
          )}
        </View>

        {showEmail && !sent ? (
          <View style={s.quietLinks}>
            <Button
              variant="quiet"
              label={creating ? copy.haveAccount : copy.newHere}
              disabled={busy}
              onPress={() => switchTo(creating ? 'password' : 'create')}
            />
          </View>
        ) : null}
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
    fieldLabel: { marginTop: 4 },
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
    quietLinks: { alignItems: 'flex-start', marginLeft: -8, marginTop: -6 },
  }),
});
