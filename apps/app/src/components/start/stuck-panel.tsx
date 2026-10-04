import { STUCK_MINUTES, stuckReasons, voice, type StuckReason } from '@pn/core';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { ApiError } from '@/lib/api';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.start;

type Props = {
  /** Asks the AI for one tiny first action, avoiding earlier suggestions. */
  shrink: (reason: StuckReason, avoid: string[]) => Promise<string>;
  /** Restart the clock on this action. */
  onAccept: (action: string) => void;
  onBreather: () => void;
  onBack: () => void;
};

type State =
  | { kind: 'asking' }
  | { kind: 'shrinking'; reason: StuckReason }
  | { kind: 'suggested'; reason: StuckReason; action: string }
  | { kind: 'failed'; reason: StuckReason; message: string };

/** "I'm stuck": one tap on what's in the way, then a two-minute first action (or a breather). */
export function StuckPanel({ shrink, onAccept, onBreather, onBack }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [state, setState] = useState<State>({ kind: 'asking' });
  const [tried, setTried] = useState<string[]>([]);

  const ask = async (reason: StuckReason, avoid: string[]) => {
    setState({ kind: 'shrinking', reason });
    try {
      const action = await shrink(reason, avoid);
      setTried([...avoid, action]);
      setState({ kind: 'suggested', reason, action });
    } catch (e) {
      const limited = e instanceof ApiError && e.status === 429;
      setState({ kind: 'failed', reason, message: limited ? copy.stuckLimit : copy.stuckFailed });
    }
  };

  if (state.kind === 'shrinking') {
    return (
      <View style={s.waiting} accessibilityLiveRegion="polite">
        <ActivityIndicator color={c.primary} />
        <Text variant="lead">{copy.shrinking}</Text>
      </View>
    );
  }

  if (state.kind === 'suggested') {
    return (
      <View style={s.panel}>
        <View style={s.tiny} accessibilityLiveRegion="polite">
          <Text variant="label" color={c.primaryText}>
            {copy.justThis.toUpperCase()}
          </Text>
          <Text variant="step">{state.action}</Text>
        </View>
        <Button label={copy.startTiny(STUCK_MINUTES)} onPress={() => onAccept(state.action)} />
        <View style={s.row}>
          <View style={s.half}>
            <Button variant="secondary" label={copy.another} onPress={() => ask(state.reason, tried)} />
          </View>
          <View style={s.half}>
            <Button variant="secondary" label={copy.back} onPress={onBack} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.panel}>
      <View style={s.head}>
        <Text variant="section" accessibilityRole="header" style={s.centered}>
          {copy.stuckTitle}
        </Text>
        <Text variant="body" color={c.inkSoft} style={s.centered}>
          {copy.stuckLead}
        </Text>
      </View>
      {state.kind === 'failed' ? (
        <Text variant="meta" color={c.error} style={s.centered} accessibilityLiveRegion="polite">
          {state.message}
        </Text>
      ) : null}
      <View style={s.reasons}>
        {stuckReasons.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => ask(r.id, tried)}
            accessibilityRole="button"
            style={({ pressed }) => [s.reason, pressed && s.pressed]}>
            <Text variant="item">{r.label}</Text>
          </Pressable>
        ))}
      </View>
      <Button variant="secondary" label={copy.breatherInstead} onPress={onBreather} />
      <Button variant="quiet" label={copy.back} onPress={onBack} />
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    panel: { width: '100%', gap: 10 },
    head: { gap: 4, marginBottom: 4 },
    centered: { textAlign: 'center' },
    waiting: { alignItems: 'center', gap: 10, paddingVertical: 48 },
    reasons: { gap: 8 },
    reason: {
      minHeight: 50,
      justifyContent: 'center',
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.card,
    },
    tiny: {
      gap: 6,
      padding: 16,
      borderWidth: 1,
      borderColor: t.c.next.border,
      borderRadius: t.radii.card,
      backgroundColor: t.c.next.bg,
    },
    row: { flexDirection: 'row', gap: 10 },
    half: { flex: 1 },
    pressed: { opacity: 0.7 },
  }),
});
