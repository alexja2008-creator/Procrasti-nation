import { formatTime, relativeDayLabel, voice, type LocalDate, type Task } from '@pn/core';
import * as Haptics from 'expo-haptics';
import { useEffect, useEffectEvent, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { useAutoHeight } from '@/hooks/use-auto-height';
import { noFocusRing, oneRowOnWeb } from '@/lib/web-styles';
import { useStyles, type Tokens } from '@/theme/tokens';

type Props = {
  task: Task;
  today: LocalDate;
  inputRef: (input: TextInput | null) => void;
  onFocus: () => void;
  onToggle: () => void;
  /** Return: `title` is this line, `carried` any text after the cursor (web puts the break in the text). */
  onReturn: (title: string, carried: string) => void;
  /** Backspace in an empty line. */
  onBackspaceEmpty: () => void;
  /** The line was edited and left (or closed while being typed in). */
  onCommit: (title: string) => void;
  /** The words being typed, before they're saved (null once saved). */
  onDraft: (text: string | null) => void;
  onOpen: () => void;
};

/** A live checklist line: a checkbox and a title that are a real task. */
export function ChecklistRow({ task, today, inputRef, onFocus, onToggle, onReturn, onBackspaceEmpty, onCommit, onDraft, onOpen }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  // Typing stays local until the line is left (or Return), then saves once.
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? task.title;
  const grow = useAutoHeight(value);
  const done = !!task.completedAt;
  const day = task.scheduledOn ?? task.dueOn;
  const clock = task.scheduledOn ? task.remindAt : task.dueAt;
  const when = day ? `${relativeDayLabel(day, today)}${clock ? ` ${formatTime(new Date(clock))}` : ''}` : null;

  const type = (text: string | null) => {
    setDraft(text);
    onDraft(text);
  };
  const commit = () => {
    if (draft === null) return;
    type(null);
    onCommit(draft);
  };
  // Leaving the note mid-line (a tap on Close keeps the keyboard up, so no blur) still saves the words.
  const onLeave = useEffectEvent(() => {
    if (draft !== null) onCommit(draft);
  });
  useEffect(() => () => onLeave(), []);

  return (
    <View style={s.row}>
      <Pressable
        onPress={() => {
          if (!done && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onToggle();
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={(done ? voice.task.markNotDone : voice.task.markDone)(value)}
        style={s.check}>
        {done ? (
          <View style={s.checked}>
            <Icon name="check" size={12} color={c.onPrimary} strokeWidth={3} />
          </View>
        ) : (
          <View style={s.unchecked} />
        )}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          const nl = text.indexOf('\n');
          if (nl === -1) return type(text);
          type(null);
          grow.reset();
          onReturn(text.slice(0, nl), text.slice(nl + 1));
        }}
        onSubmitEditing={() => {
          type(null);
          onReturn(value, '');
        }}
        onKeyPress={(e) => {
          if (e.nativeEvent.key !== 'Backspace' || value !== '') return;
          // On web the key would carry on into the line that takes the focus.
          (e as unknown as { preventDefault?: () => void }).preventDefault?.();
          onBackspaceEmpty();
        }}
        onFocus={onFocus}
        onBlur={commit}
        onContentSizeChange={grow.onContentSizeChange}
        multiline
        {...oneRowOnWeb}
        submitBehavior="submit"
        accessibilityLabel={voice.notes.checklist}
        style={[s.t.text.lead, s.input, noFocusRing, done && s.done, grow.style]}
      />
      {when ? (
        <Text variant="label" color={c.muted} style={s.when}>
          {when}
        </Text>
      ) : null}
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={voice.notes.openTask(value)} style={s.open}>
        <Icon name="chevronRight" size={14} color={c.muted} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 40, marginLeft: -10 },
    check: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    unchecked: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: t.c.checkbox },
    checked: { width: 18, height: 18, borderRadius: 9, backgroundColor: t.c.primary, alignItems: 'center', justifyContent: 'center' },
    input: { flex: 1, color: t.c.ink, padding: 0, paddingVertical: 6 },
    done: { color: t.c.muted, textDecorationLine: 'line-through' },
    when: { letterSpacing: 0, marginLeft: 6 },
    open: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  }),
});
