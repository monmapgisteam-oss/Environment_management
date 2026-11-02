import { NextResponse, type NextRequest } from 'next/server';
import { LOGIN_PATH, renewedToken, SESSION_COOKIE, sessionCookieOptions, verifyToken, type Role } from '@/lib/auth/session';

// Optimistic gate in front of every signed-in area: it checks the session
// token only. Layouts and API routes still check the user in the database.
const AREA_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/reviewer', roles: ['review_manager'] },
  { prefix: '/evaluator', roles: ['evaluator'] },
  { prefix: '/sender', roles: ['sender'] },
  { prefix: '/registration', roles: ['sender'] },
  { prefix: '/report', roles: ['admin', 'review_manager', 'evaluator', 'sender'] },
  { prefix: '/profile', roles: ['admin', 'review_manager', 'evaluator', 'sender'] },
];

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// API calls that change data must come from this app's own pages. The
// session cookie is SameSite=Lax, which stops other sites but not a sibling
// subdomain; checking where the request came from closes that gap.
function crossSiteWrite(request: NextRequest) {
  if (SAFE_METHODS.includes(request.method)) return false;
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite !== 'same-origin' && fetchSite !== 'none';
  const origin = request.headers.get('origin');
  // No Origin and no Sec-Fetch-Site: not a browser (scripts, tests), which
  // carries no victim's cookie on its own.
  if (!origin) return false;
  return origin !== request.nextUrl.origin;
}

// Passes the request on, renewing the session cookie when it is getting old.
// The database checks (active account, password version) still run in the
// route; a renewed token carries the same password version, so a reset still
// ends it.
function next(request: NextRequest) {
  const response = NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const renewed = token ? renewedToken(token) : null;
  if (renewed) response.cookies.set(SESSION_COOKIE, renewed, sessionCookieOptions());
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/')) {
    if (crossSiteWrite(request)) {
      return NextResponse.json({ error: 'Хүсэлтийг зөвшөөрөөгүй.' }, { status: 403 });
    }
    // Not when signing out: logout clears the cookie.
    return pathname === '/api/auth/logout' ? NextResponse.next() : next(request);
  }
  const area = AREA_ROLES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!area) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifyToken(token) : null;
  if (session && area.roles.includes(session.role)) return next(request);

  const loginPath = area.roles.length === 1 ? LOGIN_PATH[area.roles[0]] : '/';
  return NextResponse.redirect(new URL(loginPath, request.url));
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/reviewer/:path*',
    '/evaluator/:path*',
    '/sender/:path*',
    '/registration',
    '/report/:path*',
    '/profile',
  ],
};
