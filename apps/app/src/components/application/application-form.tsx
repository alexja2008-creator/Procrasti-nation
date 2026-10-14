import { pageNumber, voice, type ApplicationPage } from '@pn/core';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

const copy = voice.application;

type Props = {
  page: ApplicationPage;
  title: string;
  lead?: string;
  children?: ReactNode;
  /** The buttons under the page (Back, Continue, …). */
  footer?: ReactNode;
  error?: string | null;
};

/** One page of the Citizenship Application: a passport form with its page number. */
export function ApplicationForm({ page, title, lead, children, footer, error }: Props) {
  const s = useStyles(makeStyles);
  const { c } = s.t;
  const number = pageNumber(page);

  return (
    <View style={s.wrap}>
      <View style={s.form}>
        <View style={s.header}>
          <Text variant="label" color={c.muted}>
            {copy.eyebrow.toUpperCase()}
          </Text>
          {number ? (
            <Text variant="labelSmall" color={c.muted} accessibilityLabel={copy.page(number.n, number.of)}>
              {copy.page(number.n, number.of).toUpperCase()}
            </Text>
          ) : null}
        </View>
        <View style={s.rule} />
        <Text variant="pageTitle" accessibilityRole="header">
          {title}
        </Text>
        {lead ? (
          <Text variant="lead" color={c.inkSoft}>
            {lead}
          </Text>
        ) : null}
        {children}
      </View>
      {error ? (
        <Text variant="meta" color={c.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </View>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    wrap: { gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
    form: {
      gap: 14,
      paddingTop: 16,
      paddingBottom: 20,
      paddingHorizontal: 18,
      backgroundColor: t.c.page,
      borderWidth: 1,
      borderColor: t.c.pageBorder,
      borderRadius: t.radii.card,
    },
    // At narrow widths the page number drops under the title whole, instead of breaking its words.
    header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8, rowGap: 4 },
    rule: { height: 1, backgroundColor: t.c.outline },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  }),
});
