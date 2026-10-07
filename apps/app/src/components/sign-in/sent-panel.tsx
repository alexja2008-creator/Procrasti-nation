import { voice } from '@pn/core';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useTokens } from '@/theme/tokens';

const copy = voice.signIn;

type Props = {
  body: string;
  /** A second line, e.g. what to do if the address already has an account. */
  aside?: string;
  error: ReactNode;
  secondsLeft: number;
  busy: boolean;
  onResend: () => void;
  resendLabel?: string;
  backLabel: string;
  onBack: () => void;
};

/** "Check your email." after asking for a sign-in link, a confirmation or a reset. */
export function SentPanel({ body, aside, error, secondsLeft, busy, onResend, resendLabel = copy.resend, backLabel, onBack }: Props) {
  const t = useTokens();
  return (
    <View style={styles.sent} accessibilityLiveRegion="polite">
      <Icon name="mail" size={28} color={t.c.primary} />
      <Text variant="section" accessibilityRole="header">
        {copy.sentTitle}
      </Text>
      <Text variant="body" color={t.c.inkSoft}>
        {body}
      </Text>
      {aside ? (
        <Text variant="meta" color={t.c.muted}>
          {aside}
        </Text>
      ) : null}
      {error}
      <View style={styles.actions}>
        <Button
          variant="quiet"
          label={secondsLeft > 0 ? copy.resendIn(secondsLeft) : resendLabel}
          disabled={busy || secondsLeft > 0}
          onPress={onResend}
        />
        <Button variant="quiet" label={backLabel} onPress={onBack} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sent: { gap: 10, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginLeft: -8 },
});
