import { voice } from '@pn/core';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/button';
import { DraftPage } from '@/components/draft-page';
import { Text } from '@/components/text';
import { supabase } from '@/lib/supabase';
import { useTokens } from '@/theme/tokens';

export default function PassportScreen() {
  const t = useTokens();
  const { session } = useAuth();
  const email = session?.user.email;

  return (
    <DraftPage
      eyebrow="PASSPORT · PASSEPORT"
      title={voice.passportLead}
      lead="Your citizen page, stamps and residency. Being drafted.">
      <View style={styles.account}>
        {email ? (
          <Text variant="meta" color={t.c.muted}>
            {voice.signIn.signedInAs(email)}
          </Text>
        ) : null}
        <Button variant="secondary" label={voice.signIn.signOut} onPress={() => supabase.auth.signOut()} />
      </View>
    </DraftPage>
  );
}

const styles = StyleSheet.create({ account: { gap: 10, marginTop: 24, alignItems: 'flex-start' } });
