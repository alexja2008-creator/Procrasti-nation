import type { TypeRole } from '@pn/core';
import { Text as RNText, type TextProps } from 'react-native';

import { useTokens } from '@/theme/tokens';

type Props = TextProps & {
  variant?: TypeRole;
  /** Defaults to ink. */
  color?: string;
};

/** Text set in an A2 type role. Nest a plain RN `Text` for inline italics or color. */
export function Text({ variant = 'body', color, style, ...props }: Props) {
  const t = useTokens();
  return <RNText {...props} style={[t.text[variant], { color: color ?? t.c.ink }, style]} />;
}
