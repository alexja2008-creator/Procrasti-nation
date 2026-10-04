import {
  actions,
  describeRRule,
  formatTime,
  parseQuickAdd,
  relativeDayLabel,
  voice,
  type QuickAddResult,
} from '@pn/core';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/text';
import { useTasks } from '@/data/tasks-store';
import { useIsWide } from '@/hooks/use-is-wide';
import { useStyles, type Tokens } from '@/theme/tokens';

const CaptureCtx = createContext<{ open: () => void }>({ open: () => {} });

/** Opens the quick-add sheet from anywhere in the signed-in app. */
export const useCapture = () => useContext(CaptureCtx);

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <CaptureCtx.Provider value={{ open: () => setVisible(true) }}>
      {children}
      {visible ? <CaptureSheet onClose={() => setVisible(false)} /> : null}
    </CaptureCtx.Provider>
  );
}

type Chip = { icon: IconName; label: string; muted?: boolean };

function chipsFor(p: QuickAddResult, today: string): Chip[] {
  const chips: Chip[] = [];
  if (p.rrule) chips.push({ icon: 'repeat', label: describeRRule(p.rrule) });
  if (p.scheduledOn) chips.push({ icon: 'calendar', label: relativeDayLabel(p.scheduledOn, today) });
  if (p.dueOn) chips.push({ icon: 'calendar', label: voice.capture.due(relativeDayLabel(p.dueOn, today)) });
  if (p.time) chips.push({ icon: 'clock', label: formatTime(new Date(2000, 0, 1, p.time.hour, p.time.minute)) });
  if (!p.scheduledOn && !p.dueOn) chips.push({ icon: 'inbox', label: voice.capture.landsInCustoms, muted: true });
  return chips;
}

function whereItWent(p: QuickAddResult, today: string): string {
  const day = p.scheduledOn ?? p.dueOn;
  if (!day) return voice.capture.whereCustoms;
  if (day === today) return voice.capture.whereToday;
  return voice.capture.whereDay(relativeDayLabel(day, today));
}

function CaptureSheet({ onClose }: { onClose: () => void }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const wide = useIsWide();
  const insets = useSafeAreaInsets();
  const { add, today } = useTasks();

  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<QuickAddResult | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const onChange = (value: string) => {
    setText(value);
    setConfirmation(null);
    setParsed(value.trim() ? parseQuickAdd(value.trim(), new Date()) : null);
  };

  const submit = async () => {
    const p = parsed;
    if (!p) return;
    setText('');
    setParsed(null);
    const saved = await add(p);
    if (saved) setConfirmation(voice.capture.added(whereItWent(p, today)));
  };

  return (
    <Modal visible transparent animationType={Platform.OS === 'web' ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[s.fill, wide ? s.centered : s.bottom]}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={actions.done}
        />
        <View style={[s.sheet, wide ? s.dialog : { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
          <View style={s.header}>
            <Text variant="label" color={c.muted}>
              {voice.capture.eyebrow.toUpperCase()}
            </Text>
            <Button variant="quiet" label={actions.done} onPress={onClose} />
          </View>

          <TextInput
            value={text}
            onChangeText={onChange}
            onSubmitEditing={submit}
            submitBehavior="submit"
            autoFocus
            placeholder={voice.capture.placeholder}
            placeholderTextColor={c.muted}
            returnKeyType="done"
            accessibilityLabel={voice.capture.eyebrow}
            style={s.input}
          />

          <View style={s.chips} accessibilityLiveRegion="polite">
            {parsed
              ? chipsFor(parsed, today).map((chip) => (
                  <View key={chip.label} style={[s.chip, chip.muted && s.chipMuted]}>
                    <Icon name={chip.icon} size={13} color={chip.muted ? c.muted : c.primaryText} strokeWidth={2} />
                    <Text variant="meta" color={chip.muted ? c.muted : c.primaryText}>
                      {chip.label}
                    </Text>
                  </View>
                ))
              : confirmation ? (
                  <Text variant="meta" color={c.primaryText}>
                    {confirmation}
                  </Text>
                ) : null}
          </View>

          <Button label={actions.add} disabled={!parsed} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    fill: { flex: 1 },
    bottom: { justifyContent: 'flex-end' },
    centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
    sheet: {
      gap: 12,
      paddingTop: 8,
      paddingHorizontal: 20,
      backgroundColor: t.c.card,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderTopWidth: 1,
      borderColor: t.c.rule,
    },
    dialog: { width: '100%', maxWidth: 520, borderRadius: 18, borderWidth: 1, paddingBottom: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -8 },
    input: {
      minHeight: 52,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
      color: t.c.ink,
      fontFamily: t.fonts.body,
      fontSize: 17,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 28, alignItems: 'center' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: t.radii.pill,
      backgroundColor: t.c.next.bg,
      borderWidth: 1,
      borderColor: t.c.next.border,
    },
    chipMuted: { backgroundColor: t.c.chip, borderColor: t.c.rule },
  }),
});
