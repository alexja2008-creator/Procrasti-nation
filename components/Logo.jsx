'use client';

// PN mark: Flag Treatment B
// P — forward-leaning parallelogram pole (white) with a rectangular
//     parallelogram flag (teal→emerald gradient) flying off the top-right
// N — bold italic letterform: two angled vertical stems + diagonal crossbar,
//     rendered as a single unified shape in white

export default function Logo({ size = 'md', darkText = false }) {
  const sizes = {
    sm: { mark: 22, text: 'text-base' },
    md: { mark: 30, text: 'text-xl' },
    lg: { mark: 44, text: 'text-3xl' },
  };
  const { mark, text } = sizes[size] || sizes.md;
  const stemColor = darkText ? '#1e293b' : '#ffffff';
  const baseColor = darkText ? 'text-slate-900' : 'text-white';

  return (
    <div className="flex items-center space-x-2.5">
      {/* PN mark SVG — viewBox 200×180 */}
      <svg
        width={mark}
        height={Math.round(mark * 0.9)}
        viewBox="0 0 286 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="pn-flag" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* ── P ── x: 18→138, width: 120px */}
        {/* Pole */}
        <polygon
          points="18,170 32,10 50,10 36,170"
          fill={stemColor}
        />
        {/* Flag — left edge matches pole right-side slant: (50,10)→(36,170), at y=72: x≈45 */}
        <polygon
          points="50,10 138,10 133,72 45,72"
          fill="url(#pn-flag)"
        />

        {/* ── N ── x: 148→268, width: 120px (matches P) */}
        {/* Left stem */}
        <polygon
          points="148,170 162,10 180,10 166,170"
          fill={stemColor}
        />
        {/* Right stem */}
        <polygon
          points="232,170 246,10 268,10 250,170"
          fill={stemColor}
        />
        {/* Diagonal crossbar: same 18px thickness as stems */}
        <polygon
          points="162,10 180,10 250,170 232,170"
          fill={stemColor}
        />
      </svg>

      {/* Wordmark */}
      <span
        className={`${text} font-bold tracking-tight leading-none ${baseColor}`}
        style={{ fontFamily: "'Space Grotesk', sans-serif", transform: 'skewX(-5deg)', display: 'inline-block' }}
      >
        Procrasti<span className="text-emerald-400">Nation</span>
      </span>
    </div>
  );
}
