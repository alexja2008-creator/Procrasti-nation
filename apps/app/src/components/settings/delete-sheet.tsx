import { voice } from '@pn/core';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { deleteMyAccount } from '@/data/account';
import { ApiError } from '@/lib/api';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.settings;

type Props = {
  userId: string;
  /** Download your data, offered first. */
  onDownload: () => void;
  downloading: boolean;
  onClose: () => void;
};

/**
 * Delete your passport: what goes, that it's for good, a download first, then DELETE typed out.
 * On success the session ends and the app goes back to Welcome.
 */
export function DeleteSheet({ userId, onDownload, downloading, onClose }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = typed.trim().toUpperCase() === 'DELETE';

  const remove = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount(userId);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 502 ? copy.deleteBilling : copy.deleteFailed);
      setBusy(false);
    }
  };

  return (
    <Sheet title={copy.deleteTitle} onClose={busy ? () => undefined : onClose} width={440}>
      <View style={s.body}>
        <Text variant="body" color={c.inkSoft}>
          {copy.deleteBody}
        </Text>
        <View style={s.quiet}>
          <Button variant="quiet" label={downloading ? copy.preparingData : copy.deleteDownloadFirst} disabled={downloading || busy} onPress={onDownload} />
        </View>
        <Text variant="labelSmall" color={c.muted} aria-hidden>
          {copy.deleteTypeLabel.toUpperCase()}
        </Text>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          placeholder="DELETE"
          placeholderTextColor={c.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          editable={!busy}
          accessibilityLabel={copy.deleteTypeLabel}
          returnKeyType="done"
          onSubmitEditing={remove}
          style={s.input}
        />
        {error ? (
          <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button label={busy ? copy.deleting : copy.deleteConfirm} disabled={!confirmed || busy} onPress={remove} />
      </View>
    </Sheet>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    body: { gap: 12, paddingVertical: 8 },
    quiet: { alignItems: 'flex-start', marginLeft: -8, marginTop: -4 },
    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
      color: t.c.ink,
      fontFamily: t.fonts.mono,
      // 16px keeps mobile Safari from zooming into the field.
      fontSize: 16,
      letterSpacing: 2,
    },
  }),
});
