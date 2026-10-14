import RoundStamp from './RoundStamp';

// A slow drift of the Passport's stamps under the hero. Decorative, so hidden from screen readers;
// still for anyone who prefers reduced motion (globals.css).
const STAMPS = [
  { ink: 'var(--stamp-violet)', lines: ['DECLARATION', 'SIGNED'], date: '16 OCT · 2026', tilt: -8, drop: 10 },
  { ink: 'var(--stamp-terracotta)', lines: ['OFFICIALLY', 'STARTED'], date: 'ANY DAY NOW', tilt: 6, drop: 0 },
  { ink: 'var(--accent)', lines: ['FIRST STEP', 'TAKEN'], date: 'FIVE MINUTES', tilt: -3, drop: 16 },
  { ink: 'var(--stamp-forest)', lines: ['CLEARED', 'CUSTOMS'], date: 'ALL FILED', tilt: 9, drop: 4 },
  { ink: 'var(--stamp-violet)', lines: ['DECLARATION', 'KEPT'], date: 'ON TIME', tilt: -11, drop: 12 },
  { ink: 'var(--stamp-terracotta)', lines: ['OFFICIALLY', 'DONE'], date: 'ONE STEP', tilt: 4, drop: 2 },
  { ink: 'var(--stamp-forest)', lines: ['APPLICATION', 'APPROVED'], date: 'WELCOME · 2026', tilt: -6, drop: 14 },
];

export default function StampStrip() {
  // Two copies side by side, moved left by one copy's width, loop without a seam.
  const copy = (key) =>
    STAMPS.map((s, i) => (
      <div key={`${key}${i}`} className="strip-stamp" style={{ transform: `translateY(${s.drop}px) rotate(${s.tilt}deg)` }}>
        <RoundStamp ink={s.ink} lines={s.lines} date={s.date} size={96} />
      </div>
    ));
  return (
    <div className="stamp-strip" aria-hidden="true">
      <div className="strip-track">
        {copy('a')}
        {copy('b')}
      </div>
    </div>
  );
}
