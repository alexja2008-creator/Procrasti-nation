import { useId } from 'react';

// The round ink stamp from the app's Passport (apps/app/src/components/stamp.tsx), for the web:
// rim text on both arcs, two words in the middle, in a 120-unit box.
const WORD_SIZE = 12.5;
const LETTER = 0.6;
const fit = (word, width) => Math.min(WORD_SIZE, (width / word.length - LETTER) / 0.6); // Plex Mono: 0.6 em a glyph
const RIM_SIZE = 8.5;
const RIM_TOP = 40;
const RIM_BOTTOM = RIM_TOP + 0.698 * RIM_SIZE;
const arc = (r, sweep) => `M ${60 - r} 60 A ${r} ${r} 0 0 ${sweep} ${60 + r} 60`;

export default function RoundStamp({ ink, rim = 'PROCRASTINATION', lines, date, size = 120, className = '', style }) {
  const id = `stamp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  // A style, not the fontFamily attribute: SVG presentation attributes don't take var() everywhere.
  const mono = { fontFamily: 'var(--font-plex-mono), ui-monospace, monospace' };
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={className} style={style}>
      <defs>
        <path id={`${id}top`} d={arc(RIM_TOP, 1)} />
        <path id={`${id}bottom`} d={arc(RIM_BOTTOM, 0)} />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke={ink} strokeWidth="1.8" strokeDasharray="3.5 2.5" />
      <circle cx="60" cy="60" r="50" fill="none" stroke={ink} strokeWidth="1.4" />
      <text fill={ink} style={mono} fontSize={RIM_SIZE} letterSpacing="1.6" textAnchor="middle">
        <textPath href={`#${id}top`} startOffset="50%">{rim}</textPath>
      </text>
      <text x="60" y="59" fill={ink} textAnchor="middle" style={mono} fontWeight="500" fontSize={fit(lines[0], 84)} letterSpacing={LETTER}>
        {lines[0]}
      </text>
      <text x="60" y="74" fill={ink} textAnchor="middle" style={mono} fontWeight="500" fontSize={fit(lines[1], 56)} letterSpacing={LETTER}>
        {lines[1]}
      </text>
      <text fill={ink} style={mono} fontSize="8" letterSpacing="1.4" textAnchor="middle">
        <textPath href={`#${id}bottom`} startOffset="50%">{date}</textPath>
      </text>
    </svg>
  );
}
