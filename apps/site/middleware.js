import { NextResponse } from 'next/server';

// CORS for /api/*. The v2 Expo web app (app.procrasti-nation.work, or
// localhost:8081 in development) calls these routes from another origin.
// Native iOS sends no Origin header and isn't subject to CORS at all.
const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_BASE_URL || 'https://procrasti-nation.work',
  'https://app.procrasti-nation.work',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:8081'] : []),
]);

function withCors(response, origin) {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '600');
  response.headers.set('Vary', 'Origin');
  return response;
}

export function middleware(request) {
  const origin = request.headers.get('origin');
  const allowed = origin && ALLOWED_ORIGINS.has(origin);

  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    return allowed ? withCors(preflight, origin) : preflight;
  }
  const response = NextResponse.next();
  return allowed ? withCors(response, origin) : response;
}

export const config = { matcher: '/api/:path*' };
