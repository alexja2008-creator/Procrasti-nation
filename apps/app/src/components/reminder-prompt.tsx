import { formatTime, localDateString, relativeDayPhrase, voice } from '@pn/core';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.reminders;

type Props = { ringsAt: Date; onAllow: () => void; onNotNow: () => void };

/** Asked the first time a task gets a time: "Want a nudge at 6:00 PM?" Allow leads to iOS's own prompt. */
export function ReminderPrompt({ ringsAt, onAllow, onNotNow }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const day = relativeDayPhrase(localDateString(ringsAt), localDateString());
  const dayWords = day === 'today' ? null : day === 'tomorrow' ? day : `on ${day}`;
  return (
    <Sheet
      onClose={onNotNow}
      width={360}
      footer={
        <View style={s.actions}>
          <Button label={copy.allow} onPress={onAllow} />
          <Button variant="quiet" label={copy.notNow} onPress={onNotNow} />
        </View>
      }>
      <View style={s.body}>
        <View style={s.mark} aria-hidden>
          <Icon name="bell" size={24} color={c.primaryText} strokeWidth={1.8} />
        </View>
        <Text variant="section" accessibilityRole="header">
          {copy.askTitle(dayWords, formatTime(ringsAt))}
        </Text>
        <Text variant="body" color={c.inkSoft}>
          {copy.askBody}
        </Text>
      </View>
    </Sheet>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    body: { gap: 8, paddingTop: 6, paddingBottom: 10 },
    mark: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.c.next.bg,
      borderWidth: 1,
      borderColor: t.c.next.border,
      marginBottom: 4,
    },
    actions: { gap: 4, paddingBottom: 4 },
  }),
});
