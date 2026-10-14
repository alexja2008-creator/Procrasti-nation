import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

/** The faint 135° security-print lines on passport paper, 7px apart. */
export function SecurityLines({ color }: { color: string }) {
  // Unique per instance: on web every mounted screen shares one DOM, and a
  // pattern id that resolves into a hidden screen draws nothing.
  const id = `security-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Rect x={0} y={0} width={1} height={7} fill={color} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ passThrough: { pointerEvents: 'none' } });
