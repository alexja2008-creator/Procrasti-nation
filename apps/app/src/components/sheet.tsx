import { voice } from '@pn/core';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { useIsWide } from '@/hooks/use-is-wide';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = {
  onClose: () => void;
  /** Mono eyebrow at the top, e.g. "WHEN". */
  title?: string;
  /** Anything else above the content, e.g. the task's title. */
  header?: ReactNode;
  /** Pinned below the scrolling content, e.g. Clear / Done. */
  footer?: ReactNode;
  children: ReactNode;
  /** Card width on laptop-width web. */
  width?: number;
};

/** A bottom sheet on phones and a centered card at laptop width. Mount it to show it. */
export function Sheet({ onClose, title, header, footer, children, width = 380 }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const wide = useIsWide();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* The sheet rides above the keyboard when one of its fields has focus. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.backdrop, wide && s.backdropWide]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={voice.cancel} />
        <View
          style={[s.sheet, wide ? [s.card, { width }] : { paddingBottom: Math.max(insets.bottom, 12) }]}
          accessibilityViewIsModal>
          <ScrollView bounces={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            {title ? (
              <Text variant="label" color={c.muted} accessibilityRole="header">
                {title.toUpperCase()}
              </Text>
            ) : null}
            {header}
            {children}
          </ScrollView>
          {footer ? <View style={s.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: t.c.scrim },
    backdropWide: { justifyContent: 'center', alignItems: 'center' },
    sheet: {
      maxHeight: '88%',
      backgroundColor: t.c.card,
      borderTopLeftRadius: t.radii.card,
      borderTopRightRadius: t.radii.card,
    },
    card: { borderRadius: t.radii.card },
    content: { gap: 4, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 8 },
    footer: { paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.c.rule },
  }),
});
