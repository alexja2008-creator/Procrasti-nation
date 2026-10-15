import { formatPhone, voice } from '@pn/core';
import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.application;

/** What happened, then Continue: saved with a code, the link sent, not sendable just now, or confirmed meanwhile. */
export function SaveOutcome({ text, onDone }: { text: string; onDone: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.column} accessibilityLiveRegion="polite">
      <Text variant="body" color={s.t.c.inkSoft}>
        {text}
      </Text>
      <Button label={copy.next} onPress={onDone} />
    </View>
  );
}

type LeaveProps = { busy: boolean; error: ReactNode; onLeave: () => void; onKeep: () => void };

/** Their email already has a passport: leave this unsaved one (it's lost) to sign in to that one. */
export function LeaveForOtherPassport({ busy, error, onLeave, onKeep }: LeaveProps) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.column} accessibilityLiveRegion="polite">
      <Text variant="body" color={s.t.c.inkSoft}>
        {copy.signInInsteadBody}
      </Text>
      {error}
      <Button label={copy.signOutToSignIn} disabled={busy} onPress={onLeave} />
      <View style={s.quiet}>
        <Button variant="quiet" label={copy.keepThisOne} disabled={busy} onPress={onKeep} />
      </View>
    </View>
  );
}

type CodeProps = {
  phone: string;
  code: string;
  onCode: (code: string) => void;
  busy: boolean;
  error: ReactNode;
  onConfirm: () => void;
  onNewCode: () => void;
  onDifferentNumber: () => void;
};

/** The texted code that saves the passport with a phone (hidden until texted codes are on). */
export function CodeStep({ phone, code, onCode, busy, error, onConfirm, onNewCode, onDifferentNumber }: CodeProps) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.column}>
      <Text variant="body" color={s.t.c.inkSoft}>
        {copy.codeSent(formatPhone(phone))}
      </Text>
      <Text variant="labelSmall" color={s.t.c.muted} aria-hidden style={s.label}>
        {copy.codeLabel.toUpperCase()}
      </Text>
      <TextInput
        value={code}
        onChangeText={(t) => onCode(t.replace(/\D/g, '').slice(0, 8))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        maxLength={8}
        editable={!busy}
        accessibilityLabel={copy.codeLabel}
        returnKeyType="done"
        onSubmitEditing={onConfirm}
        style={[s.input, s.code]}
      />
      {error}
      <Button label={busy ? copy.savingPassport : copy.confirmCode} disabled={busy || code.length < 6} onPress={onConfirm} />
      <View style={s.quiet}>
        <Button variant="quiet" label={copy.newCode} disabled={busy} onPress={onNewCode} />
        <Button variant="quiet" label={copy.differentNumber} disabled={busy} onPress={onDifferentNumber} />
      </View>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    column: { gap: 10 },
    label: { marginTop: 4 },
    // The same field as Save your passport's.
    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
      color: t.c.ink,
      fontFamily: t.fonts.body,
      fontSize: 16,
    },
    code: { fontFamily: t.fonts.mono, fontSize: 22, letterSpacing: 6 },
    quiet: { alignItems: 'flex-start', marginLeft: -8 },
  }),
});
