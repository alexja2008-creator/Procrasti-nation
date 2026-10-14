import { formatStampDate, voice } from '@pn/core';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CountStamp, RoundStamp } from '@/components/stamp';
import { Text } from '@/components/text';
import type { PassportStamps } from '@/data/stamps';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.passport;

/** Nothing earned yet (and what shows while the Passport loads). */
export const NO_STAMPS: PassportStamps = { approvedAt: null, firstDeclarationAt: null, firstStartAt: null, stepsDone: 0 };

/**
 * The Passport's stamps, laid down left to right in the order they were earned (the Application's
 * Declaration comes before its Approved), overlapping a little like a real passport page.
 */
export function StampPage({ stamps: earned }: { stamps: PassportStamps }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const [pageWidth, setPageWidth] = useState(0);
  const { approvedAt, firstDeclarationAt, firstStartAt, stepsDone } = earned;

  const rounds = [
    { at: approvedAt, ink: c.stamp.forest, lines: voice.stampText.approved },
    { at: firstDeclarationAt, ink: c.stamp.violet, lines: voice.stampText.declared },
    { at: firstStartAt, ink: c.stamp.terracotta, lines: voice.stampText.started },
  ]
    .filter((round): round is typeof round & { at: string } => !!round.at)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const stamps = rounds.map((round, i) => ({
    stamp: <RoundStamp ink={round.ink} rim={voice.stampText.rim} lines={round.lines} date={formatStampDate(new Date(round.at))} />,
    slot: ROUND_SLOTS[i],
  }));
  if (stepsDone > 0) {
    stamps.push({
      stamp: <CountStamp ink={c.stamp.violet} top={voice.stampText.smallSteps[0]} value={stepsDone} bottom={voice.stampText.smallSteps[1]} />,
      slot: countSlot(stamps.at(-1)?.slot),
    });
  }

  if (stamps.length === 0) {
    return (
      <Text variant="body" color={c.inkSoft}>
        {copy.noStamps}
      </Text>
    );
  }

  // A card narrower than the stamps shrinks them to fit instead of spilling past its edge.
  const stampsWidth = stamps[stamps.length - 1].slot.left + STAMP_REACH;
  const scale = pageWidth > 0 ? Math.min(1, pageWidth / stampsWidth) : 1;
  return (
    <View
      style={[s.page, { height: STAMP_PAGE_HEIGHT * scale }]}
      onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={copy.stampsSpoken({ approved: !!approvedAt, declared: !!firstDeclarationAt, started: !!firstStartAt, stepsDone })}>
      {pageWidth > 0 ? (
        <View style={[s.slots, { transform: [{ scale }] }]}>
          {stamps.map(({ stamp, slot }, i) => (
            <View key={i} style={[s.slot, slot]}>
              {stamp}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type Slot = { left: number; top: number; transform: { rotate: string }[] };

/** Where the round stamps land, in the order they're earned: rims overlap, words never do. */
const ROUND_SLOTS: Slot[] = [
  { left: 0, top: 2, transform: [{ rotate: '-10deg' }] },
  { left: 90, top: 38, transform: [{ rotate: '6deg' }] },
  { left: 180, top: 4, transform: [{ rotate: '-4deg' }] },
];
/** The count stamp comes last, just clear of the words on the round stamp before it (its edge reaches them). */
const countSlot = (after?: Slot): Slot => ({ left: after ? after.left + 102 : 0, top: after ? 4 : 2, transform: [{ rotate: '-5deg' }] });
/** How far a stamp reaches right of its slot (the tilted count stamp is the widest). */
const STAMP_REACH = 120;
const STAMP_PAGE_HEIGHT = 158;

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    page: { marginVertical: 4 },
    slots: { height: STAMP_PAGE_HEIGHT, transformOrigin: 'left top' },
    slot: { position: 'absolute' },
  }),
});
