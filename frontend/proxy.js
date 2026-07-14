import { NextResponse } from 'next/server';

// Server-side gate for every /dashboard/* route. This is a presence check
// on a lightweight marker cookie (see lib/api/client.js) — NOT a JWT
// verification, since the real access token lives in localStorage
// (unreachable from middleware) and the backend's refresh-token cookie is
// scoped to a different origin/port. This closes the "page fully renders
// before any auth check happens" gap that RoleGate/per-page checks left
// open; the Bearer token + 401-refresh flow in lib/api/client.js remains
// the actual authorization boundary for every API call.
const SESSION_MARKER = 'wn_session';

export function proxy(request) {
  const hasSession = request.cookies.has(SESSION_MARKER);
  const { pathname } = request.nextUrl;

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
