import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ProcrastiNation: the AI planner that gets you to start';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Share preview for links to procrasti-nation.work (iMessage, social, Slack).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '80px', background: '#0f172a', color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 48 }}>
          <svg width="120" height="76" viewBox="0 0 286 180">
            <defs>
              <linearGradient id="flag" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <polygon points="18,170 32,10 50,10 36,170" fill="#ffffff" />
            <polygon points="50,10 138,10 133,72 45,72" fill="url(#flag)" />
            <polygon points="148,170 162,10 180,10 166,170" fill="#ffffff" />
            <polygon points="232,170 246,10 268,10 250,170" fill="#ffffff" />
            <polygon points="162,10 180,10 250,170 232,170" fill="#ffffff" />
          </svg>
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 800, marginLeft: 28 }}>
            Procrasti<span style={{ color: '#34d399' }}>Nation</span>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 980 }}>
          Break down what you're avoiding. Start it today.
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#94a3b8', marginTop: 28 }}>
          AI plans your task into steps small enough to actually start.
        </div>
      </div>
    ),
    size
  );
}
