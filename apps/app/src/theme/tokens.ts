import { fonts, hitTarget, palettes, radii, space, type, type Scheme, type TypeRole } from '@pn/core';
import { useMemo } from 'react';
import type { TextStyle } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

function build(scheme: Scheme) {
  const text = {} as Record<TypeRole, TextStyle>;
  for (const [role, t] of Object.entries(type) as [TypeRole, (typeof type)[TypeRole]][]) {
    text[role] = {
      fontFamily: fonts[t.font],
      fontSize: t.size,
      lineHeight: t.lineHeight,
      letterSpacing: 'letterSpacing' in t ? t.letterSpacing : undefined,
    };
  }
  return { scheme, c: palettes[scheme], text, fonts, space, radii, hitTarget };
}

// Built once per scheme so the object identity is stable across renders.
const TOKENS = { light: build('light'), night: build('night') };

export type Tokens = ReturnType<typeof build>;

/** A2 tokens for the current color scheme (system light/dark → day/night passport). */
export function useTokens(): Tokens {
  return useColorScheme() === 'dark' ? TOKENS.night : TOKENS.light;
}

/** Memoized per-scheme styles: `const s = useStyles(makeStyles)` with a module-level factory. */
export function useStyles<T>(factory: (t: Tokens) => T): T {
  const t = useTokens();
  return useMemo(() => factory(t), [factory, t]);
}
