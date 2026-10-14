import { splitHighlights } from '@pn/core';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

/** A search snippet with the matched words marked. */
export function Highlighted({ snippet }: { snippet: string }) {
  const s = useStyles(makeStyles);
  return (
    <Text variant="meta" color={s.t.c.inkSoft} numberOfLines={2}>
      {splitHighlights(snippet).map((part, i) =>
        part.hit ? (
          <Text key={i} variant="meta" color={s.t.c.ink} style={s.hit}>
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    hit: { fontFamily: t.fonts.bodySemibold, backgroundColor: t.c.next.bg },
  }),
});
