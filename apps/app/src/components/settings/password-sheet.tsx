import { isLongEnoughPassword, MIN_PASSWORD_LENGTH, voice } from '@pn/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { friendlyAuthError, setPassword } from '@/auth/sign-in';
import { Button } from '@/components/button';
import { PasswordField } from '@/components/password-field';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useTokens } from '@/theme/tokens';

const copy = voice.settings;

/** Settings → Password: set one (an account made by magic link has none) or change it. No email involved. */
export function PasswordSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens();
  const [password, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!isLongEnoughPassword(password)) {
      setError(voice.authErrors.tooShort(MIN_PASSWORD_LENGTH));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await setPassword(password);
      setValue('');
      setSaved(true);
    } catch (e) {
      setError(friendlyAuthError(e, copy.passwordFailed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={copy.password} onClose={onClose}>
      {saved ? (
        <View style={styles.body} accessibilityLiveRegion="polite">
          <Text variant="body">{copy.passwordSaved}</Text>
          <Button label={copy.done} onPress={onClose} />
        </View>
      ) : (
        <View style={styles.body}>
          <Text variant="meta" color={t.c.muted}>
            {copy.passwordLead(MIN_PASSWORD_LENGTH)}
          </Text>
          <PasswordField
            value={password}
            onChangeText={setValue}
            label={copy.newPassword}
            placeholder={copy.newPassword}
            isNew
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
          <Button label={busy ? copy.savingPassword : copy.savePassword} disabled={busy} onPress={save} />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingVertical: 8 },
});
