import { voice } from '@pn/core';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Sheet } from '@/components/sheet';

const copy = voice.task;
const OPTIONS = [5, 10, 15, 30, 45, 60, 90, 120];

type Props = { minutes: number | null; onSave: (minutes: number | null) => void; onClose: () => void };

/** How long it should take: one tap. */
export function EstimateSheet({ minutes, onSave, onClose }: Props) {
  return (
    <Sheet title={copy.estimate} onClose={onClose}>
      <View style={styles.chips}>
        {OPTIONS.map((n) => (
          <Chip key={n} label={copy.minutes(n)} selected={minutes === n} onPress={() => onSave(n)} />
        ))}
        <Chip label={copy.none} selected={minutes === null} onPress={() => onSave(null)} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
});
