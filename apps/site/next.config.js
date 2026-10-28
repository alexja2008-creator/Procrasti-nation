// Where the app lives (lib/site.js has the same default, for the pages). Local development points it at the
// Expo dev server with NEXT_PUBLIC_APP_URL=http://localhost:8081.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.procrasti-nation.work';

// v1's pages, retired with v2 (docs/runbooks/launch-2026-10.md). Old bookmarks and links land in the app.
const V1_PAGES = ['planner', 'dashboard', 'calendar', 'syllabus', 'reset-station', 'friends', 'profile', 'faq', 'focus-pods'];

// TestFlight's public link for the student beta. /beta is the short address said aloud in videos, since TikTok
// has no clickable links; when the beta ends or the App Store listing goes live, point it there.
const BETA_URL = 'https://testflight.apple.com/join/RFjg7TeD';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Temporary (307), not permanent: browsers cache a 308 for good, and a path might come back.
    return [
      { source: '/beta', destination: BETA_URL, permanent: false },
      ...V1_PAGES.flatMap((page) => [
        { source: `/${page}`, destination: APP_URL, permanent: false },
        { source: `/${page}/:rest*`, destination: APP_URL, permanent: false },
      ]),
    ];
  },
  async headers() {
    // CORS for /api/* lives in middleware.js (it needs a per-request origin allowlist).
    return [
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
