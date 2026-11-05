import { voice } from '@pn/core';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { openSitePage } from '@/lib/site-pages';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.aiConsent;

/**
 * "Plan it uses AI": asked once per account before Plan it or I'm stuck sends anything to
 * Anthropic (App Review 5.1.2(i)). What's sent, what isn't, Allow and Not now. The caller saves
 * the answer and makes no AI request until Allow (`docs/plans/active/ai-consent.md`).
 */
export function AiConsent({ onAllow, onNotNow }: { onAllow: () => void; onNotNow: () => void }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <View style={s.root}>
      <Text variant="pageTitle" accessibilityRole="header">
        {copy.title}
      </Text>
      <Text variant="lead" color={c.inkSoft}>
        {copy.lead}
      </Text>

      <View style={s.card}>
        <View style={s.part}>
          <Text variant="label" color={c.primaryText}>
            {copy.sentLabel.toUpperCase()}
          </Text>
          <Text variant="body">{copy.sent}</Text>
        </View>
        <View style={[s.part, s.rule]}>
          <Text variant="label" color={c.muted}>
            {copy.notSentLabel.toUpperCase()}
          </Text>
          <Text variant="body">{copy.notSent}</Text>
        </View>
      </View>

      <Text variant="meta" color={c.inkSoft}>
        {copy.training}
      </Text>
      <Pressable onPress={() => openSitePage('/privacy')} accessibilityRole="link" style={s.link}>
        <Text variant="meta" color={c.primaryText} style={s.linkText}>
          {copy.privacy}
        </Text>
      </Pressable>

      <View style={s.actions}>
        <Button label={copy.allow} onPress={onAllow} />
        <Button variant="quiet" label={copy.notNow} onPress={onNotNow} />
      </View>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    root: { gap: 12 },
    card: {
      backgroundColor: t.c.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      borderRadius: t.radii.card,
      paddingHorizontal: 16,
    },
    part: { gap: 6, paddingVertical: 14 },
    rule: { borderTopWidth: 1, borderTopColor: t.c.rule },
    // The link's text is small; the press area still reaches the minimum tap height.
    link: { alignSelf: 'flex-start', minHeight: t.hitTarget, justifyContent: 'center', marginVertical: -12 },
    linkText: { textDecorationLine: 'underline' },
    actions: { gap: 10, marginTop: 4 },
  }),
});
