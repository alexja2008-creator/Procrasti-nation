import { formatShortDate, formatTime, localDateString, voice } from '@pn/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { CountStamp } from '@/components/stamp';
import { Text } from '@/components/text';
import { fetchAllDeclarationsKept, fetchDeclarationsKept, type KeptDeclaration } from '@/data/stamps';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.passport;

/** Kept Declarations shown before Show all. */
const LATEST = 5;

/**
 * The Passport's Declarations page: a count stamp and a register of start times signed and kept,
 * newest first. Only what was kept: nothing here tallies the ones that weren't.
 */
export function DeclarationsPage({ userId }: { userId: string }) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  // `all` says which list `entries` holds, so the button's label and the rows change together.
  const [kept, setKept] = useState<{ count: number; entries: KeptDeclaration[]; all: boolean } | null>(null);
  const [all, setAll] = useState(false);

  // Refresh on every visit (a Declaration may have been kept since), keeping Show all if it's on.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = all
        ? fetchAllDeclarationsKept(userId).then((entries) => ({ count: entries.length, entries, all: true }))
        : fetchDeclarationsKept(userId, LATEST).then(({ count, latest }) => ({ count, entries: latest, all: false }));
      load.then(
        (next) => !cancelled && setKept(next),
        () => undefined, // keep what's shown; the next visit tries again
      );
      return () => {
        cancelled = true;
      };
    }, [userId, all]),
  );

  if (!kept) return null;
  const { count, entries } = kept;
  // Showing fewer needs no fetch: the first rows of every one are the latest.
  const shown = kept.all && !all ? entries.slice(0, LATEST) : entries;

  return (
    <View style={s.page}>
      <Text variant="label" color={c.muted} style={s.label} accessibilityRole="header">
        {copy.declarationsLabel.toUpperCase()}
      </Text>
      {count === 0 ? (
        <Text variant="body" color={c.inkSoft}>
          {copy.declarationsEmpty(Platform.OS === 'web')}
        </Text>
      ) : (
        <>
          <View style={s.head}>
            <View style={s.stamp}>
              <CountStamp ink={c.stamp.violet} top={voice.stampText.declarations[0]} value={count} bottom={voice.stampText.declarations[1]} />
            </View>
            <Text variant="body" color={c.inkSoft} style={s.lead}>
              {copy.declarationsLead(count)}
            </Text>
          </View>
          <View style={s.register}>
            {shown.map((d) => {
              const at = new Date(d.earnedAt);
              const day = formatShortDate(localDateString(at));
              const time = formatTime(at);
              const title = d.title ?? copy.deletedTask;
              return (
                <View key={d.id} style={s.entry} accessible accessibilityLabel={copy.declarationSpoken(title, day, time)}>
                  <Text variant="item" color={d.title ? c.ink : c.muted} numberOfLines={1} style={s.title}>
                    {title}
                  </Text>
                  <Text variant="label" color={c.muted} style={s.when}>
                    {`${day} · ${time}`}
                  </Text>
                </View>
              );
            })}
          </View>
          {count > LATEST ? (
            <View style={s.more}>
              <Button variant="quiet" label={kept.all && all ? copy.showFewer : copy.showAll(count)} onPress={() => setAll((v) => !v)} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    page: {
      gap: 10,
      paddingTop: 14,
      paddingBottom: 12,
      paddingHorizontal: 18,
      backgroundColor: t.c.card,
      borderWidth: 1,
      borderColor: t.c.rule,
      borderRadius: t.radii.card,
    },
    label: { letterSpacing: 1.5 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 4 },
    stamp: { transform: [{ rotate: '-4deg' }] },
    lead: { flex: 1 },
    register: { borderTopWidth: 1, borderTopColor: t.c.outline },
    entry: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 12,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: t.c.rule,
    },
    title: { flex: 1 },
    when: { letterSpacing: 0 },
    more: { alignItems: 'flex-start', marginLeft: -8 },
  }),
});
