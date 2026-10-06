import { voice, type List } from '@pn/core';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { kindIcon } from '@/components/territory/territory-card';
import { TerritoryEditSheet } from '@/components/territory/territory-edit-sheet';
import { Text } from '@/components/text';
import { useLists } from '@/data/lists-store';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.territories;

type Props = {
  /** The territory it's in now. */
  selected: string | null;
  /** Null takes it out of its territory. */
  onPick: (listId: string | null) => void;
  onClose: () => void;
};

/** Pick a territory for a task: one of the person's, none, or a new one made on the spot. */
export function TerritorySheet({ selected, onPick, onClose }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { lists } = useLists();
  const [creating, setCreating] = useState(false);

  // One modal at a time: the new-territory form takes this sheet's place.
  if (creating) return <TerritoryEditSheet onClose={onClose} onCreated={(l) => onPick(l.id)} />;

  const row = (key: string, icon: IconName, color: string, label: string, chosen: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: chosen }}
      style={({ pressed }) => [s.row, pressed && s.pressed]}>
      <Icon name={icon} size={20} color={color} strokeWidth={1.9} />
      <Text variant="item" style={s.label} numberOfLines={1}>
        {label}
      </Text>
      {chosen ? <Icon name="check" size={18} color={c.primaryText} strokeWidth={2.4} /> : null}
    </Pressable>
  );

  return (
    <Sheet title={voice.task.territory} onClose={onClose} width={380}>
      {lists.map((l: List) => row(l.id, kindIcon[l.kind], c.stamp[l.ink], l.name, l.id === selected, () => onPick(l.id)))}
      {row('none', 'inbox', c.muted, copy.none, selected === null, () => onPick(null))}
      <View style={s.rule} />
      {row('new', 'plus', c.primaryText, copy.newTerritoryMore, false, () => setCreating(true))}
    </Sheet>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 4 },
    label: { flex: 1 },
    rule: { height: 1, backgroundColor: t.c.rule, marginVertical: 4 },
    pressed: { opacity: 0.7 },
  }),
});
