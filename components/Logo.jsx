'use client';

// Spark mark: two overlapping forward-leaning parallelogram strokes.
// Left in teal, right in emerald — together suggesting a lightning flash,
// the precise moment inaction becomes momentum.

export default function Logo({ size = 'md', darkText = false }) {
  const sizes = {
    sm: { mark: 22, text: 'text-base' },
    md: { mark: 30, text: 'text-xl' },
    lg: { mark: 44, text: 'text-3xl' },
  };
  const { mark, text } = sizes[size] || sizes.md;
  const baseColor = darkText ? 'text-slate-900' : 'text-white';

  return (
    <div className="flex items-center space-x-2.5">
      {/* Custom SVG spark mark */}
      <svg
        width={mark}
        height={mark}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Left stroke — teal */}
        <polygon
          points="5,28 12,4 18,4 11,28"
          fill="url(#pn-teal)"
        />
        {/* Right stroke — emerald, offset, overlaps left */}
        <polygon
          points="14,28 21,4 27,4 20,28"
          fill="url(#pn-emerald)"
        />
        <defs>
          <linearGradient id="pn-teal" x1="12" y1="4" x2="5" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <linearGradient id="pn-emerald" x1="21" y1="4" x2="14" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      <span
        className={`${text} font-bold tracking-tight leading-none ${baseColor}`}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Procrastia<span className="text-emerald-400">Nation</span>
      </span>
    </div>
  );
}
