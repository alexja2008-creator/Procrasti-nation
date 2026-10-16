import { guide, type GuideExample } from '@pn/core';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useIsWide } from '@/hooks/use-is-wide';
import { useShortcuts } from '@/hooks/use-shortcuts';
import { useStyles, type Tokens } from '@/theme/tokens';

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
// The web's words say right-click and keyboard shortcuts, written as this keyboard writes them.
const web = Platform.OS === 'web';
const sections = guide.sections({ web, mac: web && /Mac|iPhone|iPad/.test(navigator.userAgent) });

/**
 * How to use ProcrastiNation: the nation's words in everyday ones, then how to do the main
 * things. Opened from the "?" beside search, and from Settings. A page on phones; a panel
 * over the page at laptop width on web, like search.
 */
export default function GuideScreen() {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const wide = useIsWide();
  const closeRef = useRef<View>(null);

  useShortcuts({ Escape: close });
  // The web's stack leaves focus on the "?" behind the guide: bring it in, so Tab and the
  // arrow keys work here instead of on the page underneath.
  useEffect(() => {
    if (web) closeRef.current?.focus();
  }, []);

  const body = (
    <View style={s.column}>
      <View style={s.topBar}>
        <Text variant="label" color={c.muted}>
          {guide.eyebrow.toUpperCase()}
        </Text>
        <Pressable
          ref={closeRef}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={guide.close}
          style={({ pressed }) => [s.iconButton, pressed && s.pressed]}>
          <Icon name="close" color={c.ink} />
        </Pressable>
      </View>
      <View style={s.intro}>
        <Text variant="pageTitle" accessibilityRole="header">
          {guide.title}
        </Text>
        <Text variant="lead" color={c.inkSoft}>
          {guide.lead}
        </Text>
      </View>

      <View style={s.words}>
        <Text variant="label" color={c.muted} accessibilityRole="header" style={s.wordsLabel}>
          {guide.wordsLabel.toUpperCase()}
        </Text>
        {guide.words.map((w, i) => (
          <View key={w.term} style={[s.word, wide && s.wordWide, i > 0 && s.rule]}>
            <Text variant="item" style={[s.term, wide && s.termWide]}>
              {w.term}
            </Text>
            <Text variant="body" color={c.inkSoft} style={s.meaning}>
              {w.meaning}
            </Text>
          </View>
        ))}
      </View>

      {sections.map((section) => (
        <View key={section.title} style={s.section}>
          <Text variant="section" accessibilityRole="header">
            {section.title}
          </Text>
          {section.blocks.map((block, i) =>
            typeof block === 'string' ? (
              <Text key={i} variant="body" color={c.inkSoft}>
                {block}
              </Text>
            ) : (
              <Examples key={i} examples={block} />
            ),
          )}
        </View>
      ))}
    </View>
  );

  if (web && wide) {
    // Laptop: a panel over the page, like search.
    return (
      <View style={s.overlay}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={guide.close}
        />
        <View style={s.panel} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={s.panelContent}>{body}</ScrollView>
        </View>
      </View>
    );
  }
  return <Screen>{body}</Screen>;
}

/** What to type, in the mono of a typed line, and what it does. */
function Examples({ examples }: { examples: readonly GuideExample[] }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <View style={s.examples}>
      {examples.map((e) => (
        <View key={e.typed} style={s.example}>
          <Text variant="body" style={s.typed}>
            {e.typed}
          </Text>
          <View style={s.means}>
            <Icon name="chevronRight" size={14} color={c.muted} strokeWidth={2} />
            <Text variant="body" color={c.inkSoft} style={s.meaning}>
              {e.means}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 22 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: -12, marginRight: -12 },
    iconButton: { width: t.hitTarget, height: t.hitTarget, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.6 },
    intro: { gap: 10 },
    // The word list is one of the passport's own pages.
    words: {
      paddingTop: 14,
      paddingBottom: 4,
      paddingHorizontal: 18,
      backgroundColor: t.c.page,
      borderWidth: 1,
      borderColor: t.c.pageBorder,
      borderRadius: t.radii.card,
    },
    wordsLabel: { letterSpacing: 1.5, marginBottom: 6 },
    word: { gap: 2, paddingVertical: 10 },
    wordWide: { flexDirection: 'row', gap: 16 },
    rule: { borderTopWidth: 1, borderTopColor: t.c.rule },
    term: { fontFamily: t.fonts.bodySemibold },
    termWide: { width: 140 },
    // minWidth 0: a long meaning wraps instead of pushing the row wider on web.
    meaning: { flex: 1, minWidth: 0 },
    section: { gap: 8 },
    examples: { gap: 10, paddingVertical: 2 },
    example: { gap: 4 },
    typed: {
      alignSelf: 'flex-start',
      fontFamily: t.fonts.mono,
      color: t.c.ink,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: t.radii.sm,
      backgroundColor: t.c.chip,
      overflow: 'hidden',
    },
    means: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
    overlay: { flex: 1, alignItems: 'center', paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24 },
    panel: {
      width: '100%',
      maxWidth: 640,
      flexShrink: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: t.c.rule,
      backgroundColor: t.c.bg,
      overflow: 'hidden',
    },
    panelContent: { paddingHorizontal: 28, paddingVertical: 24 },
  }),
});
