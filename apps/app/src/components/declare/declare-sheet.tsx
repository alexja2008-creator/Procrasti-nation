import { names, voice, type Task } from '@pn/core';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { DeclarationChoices, useDeclaration } from '@/components/declare/use-declaration';
import { SignaturePad } from '@/components/declare/signature-pad';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.declaration;

/**
 * A Declaration: pick a day and a start time, sign the line, Declare. The time becomes the
 * task's When (its reminder rings in a "you declared this" voice); Undo puts the old one back.
 */
export function DeclareSheet({ task, onClose }: { task: Task; onClose: () => void }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const d = useDeclaration(task);

  return (
    <Sheet
      title={names.declaration}
      onClose={onClose}
      width={440}
      footer={
        // The signature line sits with Declare, out of the scrolling part (a stroke is never a scroll).
        <View style={s.footer}>
          <SignaturePad value={d.signature} onChange={d.setSignature} name={d.signedName} />
          <Button label={copy.declare} disabled={!d.ready} onPress={() => d.declare() && onClose()} />
        </View>
      }>
      <Text variant="step" style={s.statement} accessibilityLiveRegion="polite">
        {d.statement}
      </Text>
      <Text variant="meta" color={c.muted}>
        {copy.why}
      </Text>
      <DeclarationChoices d={d} />
    </Sheet>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    statement: { paddingTop: 2, paddingBottom: 4 },
    footer: { gap: 4, paddingBottom: 4 },
  }),
});
