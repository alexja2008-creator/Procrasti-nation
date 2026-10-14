import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

export type Choice<T extends string> = { id: T; label: string; hint?: string; sample?: string };

type Props<T extends string> = {
  choices: readonly Choice<T>[];
  selected?: T;
  onPick: (id: T) => void;
  /** Read aloud for the group, e.g. the question. */
  label: string;
  disabled?: boolean;
};

/** The Application's answers: big cards, one picked (a radio group). */
export function ChoiceCards<T extends string>({ choices, selected, onPick, label, disabled }: Props<T>) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  return (
    <View style={s.list} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {choices.map((choice) => {
        const on = choice.id === selected;
        return (
          <Pressable
            key={choice.id}
            onPress={() => onPick(choice.id)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled: !!disabled }}
            // React Native Web only exposes the picked one through aria-checked.
            aria-checked={on}
            accessibilityLabel={choice.hint ? `${choice.label}. ${choice.hint}` : choice.label}
            style={({ pressed }) => [s.card, on && s.cardOn, pressed && s.pressed]}>
            <View style={[s.dot, on && s.dotOn]}>{on ? <View style={s.dotFill} /> : null}</View>
            <View style={s.words}>
              <Text variant="item">{choice.label}</Text>
              {choice.hint ? (
                <Text variant="meta" color={c.muted}>
                  {choice.hint}
                </Text>
              ) : null}
              {choice.sample ? (
                <Text variant="body" color={c.inkSoft} style={s.sample}>
                  “{choice.sample}”
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    list: { gap: 10 },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      minHeight: t.hitTarget,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: t.c.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      borderRadius: t.radii.lg,
    },
    cardOn: { backgroundColor: t.c.next.bg, borderColor: t.c.next.border },
    pressed: { opacity: 0.75 },
    dot: {
      width: 20,
      height: 20,
      marginTop: 1,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: t.c.checkbox,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotOn: { borderColor: t.c.primary },
    dotFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.c.primary },
    words: { flex: 1, gap: 3 },
    sample: { fontFamily: t.fonts.displayItalic, marginTop: 4 },
  }),
});
