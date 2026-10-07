import { voice } from '@pn/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SavePassport } from '@/components/save-passport';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { usePassportStatus } from '@/hooks/use-passport-status';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.application;

/** On Passport until it's saved: save it (a sheet), or choose the password that finishes saving it. */
export function PassportSaveCard() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { unsaved, owesPassword } = usePassportStatus();
  const [saving, setSaving] = useState(false);

  if (!unsaved && !owesPassword) return null;

  return (
    <View style={s.card}>
      <Text variant="item">{owesPassword ? copy.choosePasswordTitle : copy.unsavedTitle}</Text>
      <Text variant="body" color={c.inkSoft}>
        {owesPassword ? copy.choosePasswordBody : copy.unsavedBody}
      </Text>
      <View style={s.action}>
        {owesPassword ? (
          <Button
            variant="secondary"
            label={copy.choosePasswordTitle}
            onPress={() => router.push({ pathname: '/auth/new-password', params: { for: 'save' } })}
          />
        ) : (
          <Button variant="secondary" label={copy.saveAction} onPress={() => setSaving(true)} />
        )}
      </View>
      {saving ? (
        <Sheet title={copy.saveAction} onClose={() => setSaving(false)} width={440}>
          <View style={s.sheet}>
            <Text variant="meta" color={c.muted}>
              {copy.saveLead}
            </Text>
            <SavePassport onDone={() => setSaving(false)} />
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    card: {
      gap: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: t.c.primary,
      borderRadius: t.radii.card,
      backgroundColor: t.c.card,
    },
    action: { alignItems: 'flex-start', marginTop: 2 },
    sheet: { gap: 12, paddingVertical: 8 },
  }),
});
