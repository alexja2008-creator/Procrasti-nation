import { authErrorKind, cleanUsername, formatPhone, isServerFailure, isValidUsername, moveEmailFromUsername, normalizePhone, suggestUsername, voice } from '@pn/core';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { confirmSaveCode, pendingEmail, sendSaveCode, sendSaveLink } from '@/auth/passport';
import { enabledMethods, friendlyAuthError, isValidEmail } from '@/auth/sign-in';
import { signOut } from '@/auth/sign-out';
import { Button } from '@/components/button';
import { CodeStep, LeaveForOtherPassport, SaveOutcome } from '@/components/save-passport-steps';
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
 * Save your passport: an email (or, once texted codes are on, a phone), then a username, which
 * follows the email until they choose their own. Keeps the same account, so everything in the
 * anonymous passport stays. There's no Later: the Application can't finish without it (`DECISIONS.md`).
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
  // Their own username (typed, or already waiting) isn't replaced by one suggested from the email.
  const [usernameOwn, setUsernameOwn] = useState(() => username !== '');
  // What the username box held when they began typing in it (suggested, waiting or their own), so
  // an email typed after it moves without it.
  const typingFrom = useRef<{ text: string; own: boolean } | null>(null);
  // An email typed into the username box moved to the email box: what moved, and whether a
  // username came from it. The note shows while the email box still starts with it.
  const [moved, setMoved] = useState<{ from: string; suggested: boolean } | null>(null);
  const emailRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The email already has a passport: offer to sign in to it instead.
  const [emailTaken, setEmailTaken] = useState(false);
  // The username box shows what's typed (so an email typed there moves whole); this is the username.
  const name = cleanUsername(username);
  const usernameStatus = useUsernameCheck(step.kind === 'form' ? name : '');
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
    if (!isValidUsername(name)) {
      setError(signIn.usernameHint);
      return false;
    }
    if (await isUsernameTaken(name, userId).catch(() => false)) {
      setError(signIn.usernameTaken(name));
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
      if (userId) await saveUsername(userId, name).catch(() => undefined);
      setStep({ kind: 'saved', phone: e164 });
    }, rateLimitedOr(copy.wrongCode));

  const sendLink = () => {
    const address = email.trim();
    if (!isValidEmail(address)) return setError(signIn.invalidEmail);
    setEmailTaken(false);
    return run(async () => {
      if (!userId || !(await usernameReady())) return;
      if (!(await sendOrDefer(() => sendSaveLink(userId, address, name)))) return;
      setStep({ kind: 'emailSent', email: address });
    }, (e) => {
      setEmailTaken(authErrorKind(e instanceof Error ? e : null) === 'accountExists');
      return friendlyAuthError(e, copy.saveFailed);
    });
  };

  /** The email box; the username follows it until they choose their own. */
  const typeEmail = (text: string) => {
    setEmail(text);
    setEmailTaken(false);
    if (!usernameOwn) setUsername(suggestUsername(text));
  };

  /** An email typed into the username box (a tired person types it into the first box they see). */
  const moveEmail = (typed: string) => {
    const next = moveEmailFromUsername(typed, { text: username, own: usernameOwn }, typingFrom.current, email);
    typingFrom.current = null;
    setMethod('email');
    setError(null);
    setEmail(next.email);
    setEmailTaken(false);
    setUsername(next.username);
    setUsernameOwn(next.own);
    setMoved({ from: next.moved, suggested: next.suggested });
    // Focus moves without a word otherwise (the note's live region only speaks on Android). Queued on
    // iOS, so VoiceOver reading the email box doesn't cut it off.
    const said = next.suggested ? `${copy.emailMoved} ${copy.usernameFromEmail}` : copy.emailMoved;
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibilityWithOptions(said, { queue: true });
    else AccessibilityInfo.announceForAccessibility(said);
    // The rest of the address is typed where it belongs.
    setTimeout(() => emailRef.current?.focus(), 0);
  };

  const typeUsername = (typed: string) => {
    // Leaving the box tidies it to the username; that's not a choice of their own.
    if (typed === username) return;
    if (!typingFrom.current) typingFrom.current = { text: username, own: usernameOwn };
    setUsername(typed);
    // Cleared, it follows the email again.
    setUsernameOwn(typed !== '');
    if (typed === '') typingFrom.current = null;
    setMoved(null);
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
    const text = step.kind === 'saved' ? copy.savedPhone(formatPhone(step.phone)) : step.kind === 'emailSent' ? copy.emailSent(step.email) : copy.sendLater;
    return <SaveOutcome text={text} onDone={onDone} />;
  }

  // Opened meanwhile (another tab syncs the saved session here): nothing is waiting any more.
  if (step.kind === 'waiting' && !session?.user.is_anonymous) return <SaveOutcome text={copy.emailConfirmed} onDone={onDone} />;

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
      <LeaveForOtherPassport
        busy={busy}
        error={errorText}
        onLeave={() => run(signOut, () => voice.authErrors.offline)}
        onKeep={() => setStep({ kind: 'form' })}
      />
    );
  }

  const movedNote = moved && email.startsWith(moved.from) ? (moved.suggested ? `${copy.emailMoved} ${copy.usernameFromEmail}` : copy.emailMoved) : '';

  if (step.kind === 'code') {
    return (
      <CodeStep
        phone={step.phone}
        code={code}
        onCode={setCode}
        busy={busy}
        error={errorText}
        onConfirm={() => confirm(step.phone)}
        onNewCode={textCode}
        onDifferentNumber={() => setStep({ kind: 'form' })}
      />
    );
  }

  return (
    <View style={s.column}>
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
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => usernameRef.current?.focus()}
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
            ref={emailRef}
            value={email}
            onChangeText={typeEmail}
            placeholder={signIn.emailPlaceholder}
            placeholderTextColor={c.muted}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            accessibilityLabel={signIn.emailLabelSpoken}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => usernameRef.current?.focus()}
            style={s.input}
          />
        </>
      )}
      {/* Second: an email typed here moves up to the email box, and the username comes from it. */}
      {label(signIn.usernameLabel)}
      <View>
        <UsernameField
          ref={usernameRef}
          value={username}
          onChange={typeUsername}
          onEmail={moveEmail}
          status={usernameStatus}
          returnKeyType="send"
          onSubmitEditing={method === 'phone' ? textCode : sendLink}
          editable={!busy}
        />
        {/* Always there (empty, no height), so a screen reader on the web hears the note when it appears. */}
        <View accessibilityLiveRegion="polite">
          {movedNote ? (
            <Text variant="meta" color={c.muted} style={s.note}>
              {movedNote}
            </Text>
          ) : null}
        </View>
      </View>
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
    note: { marginTop: 6 },
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
    quiet: { alignItems: 'flex-start', marginLeft: -8 },
  }),
});
