import { isValidUsername, voice } from '@pn/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { UsernameField } from '@/components/username-field';
import { saveUsername } from '@/data/profile';
import { useUsernameCheck } from '@/hooks/use-username-check';
import { useTokens } from '@/theme/tokens';

const copy = voice.settings;

type Props = { userId: string; current: string | null; onSaved: (username: string) => void; onClose: () => void };

/** Settings → Username: change it, or choose one (an account made by magic link has none). */
export function UsernameSheet({ userId, current, onSaved, onClose }: Props) {
  const t = useTokens();
  const [username, setUsername] = useState(current ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = useUsernameCheck(username, current, userId);

  const save = async () => {
    if (username === current) return onClose();
    if (!isValidUsername(username)) return setError(voice.signIn.usernameHint);
    setError(null);
    setBusy(true);
    try {
      if ((await saveUsername(userId, username)) === 'taken') {
        setError(voice.signIn.usernameTaken(username));
        setBusy(false);
        return;
      }
      onSaved(username);
      onClose();
    } catch {
      setError(copy.usernameFailed);
      setBusy(false);
    }
  };

  return (
    <Sheet title={copy.username} onClose={onClose}>
      <View style={styles.body}>
        <Text variant="meta" color={t.c.muted}>
          {copy.usernameLead}
        </Text>
        <UsernameField
          value={username}
          onChange={setUsername}
          status={status}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
          editable={!busy}
        />
        {error ? (
          <Text variant="meta" color={t.c.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button label={copy.saveUsername} disabled={busy || status === 'taken'} onPress={save} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingVertical: 8 },
});
