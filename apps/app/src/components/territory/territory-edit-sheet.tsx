import { voice, type List, type ListKind } from '@pn/core';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useLists } from '@/data/lists-store';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.territories;
const KINDS: ListKind[] = ['school', 'work', 'home', 'custom'];
const INKS: List['ink'][] = ['terracotta', 'violet', 'forest'];

type Props = {
  /** The territory to edit; leave it out to create one. */
  list?: List;
  onClose: () => void;
  onCreated?: (list: List) => void;
  /** After Delete (the sheet closes itself). */
  onDeleted?: () => void;
};

/** Name, kind and stamp ink for a territory, new or existing; Delete for an existing one. */
export function TerritoryEditSheet({ list, onClose, onCreated, onDeleted }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const { add, update, remove } = useLists();
  const [name, setName] = useState(list?.name ?? '');
  const [kind, setKind] = useState<ListKind>(list?.kind ?? 'custom');
  const [ink, setInk] = useState<List['ink']>(list?.ink ?? 'forest');
  const trimmed = name.trim();

  const save = async () => {
    if (!trimmed) return;
    if (list) {
      update(list, { name: trimmed, kind, ink });
      onClose();
      return;
    }
    onClose();
    const created = await add({ name: trimmed, kind, ink });
    if (created) onCreated?.(created);
  };

  return (
    <Sheet
      title={list ? copy.edit : copy.newTerritory}
      onClose={onClose}
      width={420}
      footer={<Button label={list ? copy.save : copy.create} disabled={!trimmed} onPress={save} />}>
      <Text variant="label" color={c.muted} style={s.label}>
        {copy.nameLabel.toUpperCase()}
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={save}
        autoFocus={!list}
        maxLength={80}
        placeholder={copy.namePlaceholder}
        placeholderTextColor={c.muted}
        accessibilityLabel={copy.nameLabel}
        returnKeyType="done"
        style={[s.t.text.body, s.input]}
      />

      <Text variant="label" color={c.muted} style={s.label}>
        {copy.kindLabel.toUpperCase()}
      </Text>
      <View style={s.chips}>
        {KINDS.map((k) => (
          <Chip key={k} label={copy.kinds[k]} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>

      <Text variant="label" color={c.muted} style={s.label}>
        {copy.inkLabel.toUpperCase()}
      </Text>
      <View style={s.chips}>
        {INKS.map((i) => (
          <Pressable
            key={i}
            onPress={() => setInk(i)}
            accessibilityRole="button"
            accessibilityLabel={copy.inks[i]}
            accessibilityState={{ selected: ink === i }}
            style={({ pressed }) => [s.ink, ink === i && s.inkChosen, pressed && s.pressed]}>
            <View style={[s.swatch, { backgroundColor: c.stamp[i] }]} />
            <Text variant="button">{copy.inks[i]}</Text>
          </Pressable>
        ))}
      </View>

      {list ? (
        <View style={s.danger}>
          <Pressable
            onPress={() => {
              onClose();
              remove(list);
              onDeleted?.();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [s.delete, pressed && s.pressed]}>
            <Icon name="trash" size={18} color={c.error} strokeWidth={1.8} />
            <Text variant="item" color={c.error}>
              {copy.delete}
            </Text>
          </Pressable>
          <Text variant="meta" color={c.muted}>
            {copy.deleteNote}
          </Text>
        </View>
      ) : null}
    </Sheet>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    label: { marginTop: 10 },
    input: {
      minHeight: 48,
      paddingHorizontal: 12,
      marginTop: 4,
      color: t.c.ink,
      borderWidth: 1,
      borderColor: t.c.field.border,
      borderRadius: t.radii.lg,
      backgroundColor: t.c.field.bg,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 6 },
    ink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 36,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: t.c.outline,
      borderRadius: t.radii.pill,
      backgroundColor: t.c.bg,
    },
    inkChosen: { borderColor: t.c.ink, borderWidth: 2 },
    swatch: { width: 14, height: 14, borderRadius: 7 },
    danger: { gap: 4, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.c.rule },
    delete: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: t.hitTarget },
    pressed: { opacity: 0.7 },
  }),
});
