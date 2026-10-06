import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Stroke icons drawn for the A2 canvas (24×24 grid, round caps). Never emoji.
const glyphs = {
  sun: (
    <>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  inbox: (
    <>
      <Path d="M3 13h5l1.5 3h5l1.5-3h5" />
      <Path d="M5 5h14l2 8v6H3v-6z" />
    </>
  ),
  chevronRight: <Path d="M9 6l6 6-6 6" />,
  chevronLeft: <Path d="M15 6l-6 6 6 6" />,
  /** Drag handle. */
  grip: <Path d="M5 8h14M5 12h14M5 16h14" />,
  trash: <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  calendar: (
    <>
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  map: (
    <>
      <Path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <Path d="M9 4v14M15 6v14" />
    </>
  ),
  passport: (
    <>
      <Path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <Path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  repeat: (
    <>
      <Path d="M17 2l3 3-3 3" />
      <Path d="M4 11V9a4 4 0 0 1 4-4h12" />
      <Path d="M7 22l-3-3 3-3" />
      <Path d="M20 13v2a4 4 0 0 1-4 4H4" />
    </>
  ),
  /** "Made smaller": the shrink arrows on AI-built steps and the Plan it pill. */
  shrink: <Path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  play: <Path d="M8 5.5v13l10.5-6.5z" />,
  pause: <Path d="M9 5.5v13M15 5.5v13" />,
  clock: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3.5 2" />
    </>
  ),
  globe: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3.5 9h17M3.5 15h17M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z" />
    </>
  ),
  mail: (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </>
  ),
  pencil: <Path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  // Territory kinds.
  book: (
    <>
      <Path d="M4 5.5c2.4-1 5.1-.9 8 .7 2.9-1.6 5.6-1.7 8-.7v13c-2.4-1-5.1-.9-8 .7-2.9-1.6-5.6-1.7-8-.7z" />
      <Path d="M12 6.2v13" />
    </>
  ),
  briefcase: (
    <>
      <Rect x={3} y={7} width={18} height={13} rx={2} />
      <Path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18" />
    </>
  ),
  house: <Path d="M4 10.5L12 4l8 6.5M6 9v11h12V9M10 20v-5h4v5" />,
  flag: <Path d="M5 21V4h11l-2 4 2 4H5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof glyphs;

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

export function Icon({ name, size = 22, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden>
      {glyphs[name]}
    </Svg>
  );
}
