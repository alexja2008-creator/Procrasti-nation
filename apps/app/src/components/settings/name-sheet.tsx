import { voice } from '@pn/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { saveName } from '@/auth/person-name';
import { Button } from '@/components/button';
import { NameFields, type NameParts } from '@/components/name-fields';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useTokens } from '@/theme/tokens';

const copy = voice.settings;

type Props = { current: NameParts; onClose: () => void };

/** Settings → Name: change it, or give one (an account from before the Application asked has none). */
export function NameSheet({ current, onClose }: Props) {
  const t = useTokens();
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = name.first.trim().length > 0;

  const save = async () => {
    if (!ready || busy) return;
    setError(null);
    setBusy(true);
    try {
      await saveName(name.first, name.last);
      onClose();
    } catch {
      setError(copy.nameFailed);
      setBusy(false);
    }
  };

  return (
    <Sheet title={copy.name} onClose={onClose}>
      <View style={styles.body}>
        <Text variant="meta" color={t.c.muted}>
          {copy.nameLead}
        </Text>
        <NameFields first={name.first} last={name.last} onChange={setName} onSubmit={save} editable={!busy} autoFocus />
        {error ? (
          <Text variant="meta" color={t.c.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button label={copy.saveName} disabled={busy || !ready} onPress={save} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingVertical: 8 },
});
