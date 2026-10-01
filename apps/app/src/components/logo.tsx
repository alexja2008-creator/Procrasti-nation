import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

import { useTokens } from '@/theme/tokens';

/** The PN mark and wordmark. The flag gradient is the one "national color" and never changes. */
export function Logo({ size = 26 }: { size?: number }) {
  const t = useTokens();
  const flag = `pn-flag-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="ProcrastiNation">
      <Svg width={size} height={Math.round(size * 0.9)} viewBox="0 0 286 180" aria-hidden>
        <Defs>
          <LinearGradient id={flag} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#2dd4bf" />
            <Stop offset="100%" stopColor="#059669" />
          </LinearGradient>
        </Defs>
        <Polygon points="18,170 32,10 50,10 36,170" fill={t.c.ink} />
        <Polygon points="50,10 138,10 133,72 45,72" fill={`url(#${flag})`} />
        <Polygon points="148,170 162,10 180,10 166,170" fill={t.c.ink} />
        <Polygon points="232,170 246,10 268,10 250,170" fill={t.c.ink} />
        <Polygon points="162,10 180,10 250,170 232,170" fill={t.c.ink} />
      </Svg>
      <Text style={[styles.word, { fontFamily: t.fonts.logo, fontSize: size * 0.7, color: t.c.ink }]}>
        Procrasti<Text style={{ color: t.c.primary }}>Nation</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { letterSpacing: -0.4, transform: [{ skewX: '-5deg' }] },
});
