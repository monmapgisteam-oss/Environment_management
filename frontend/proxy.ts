import { NextResponse, type NextRequest } from 'next/server';
import { backendUrl } from '@/lib/api/config';
import { isRole, LOGIN_PATH, SESSION_COOKIE, SESSION_RENEW_AFTER_SECONDS, type Role, type SessionPayload } from '@shared/auth/roles';

// Optimistic gate in front of every signed-in area. Layouts still check the
// user with the backend, and the backend checks every API call.
const AREA_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/reviewer', roles: ['review_manager'] },
  { prefix: '/evaluator', roles: ['evaluator'] },
  { prefix: '/sender', roles: ['sender'] },
  { prefix: '/registration', roles: ['sender'] },
  { prefix: '/report', roles: ['admin', 'review_manager', 'evaluator', 'sender'] },
  { prefix: '/profile', roles: ['admin', 'review_manager', 'evaluator', 'sender'] },
];

// The proxy has no session secret: it reads the role from the cookie without
// checking the signature, only to send visitors to the right login page early.
// Every layout then asks the backend, which verifies the token and the account.
function unverifiedSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  try {
    const [, body] = token.split('.');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload?.userId !== 'string' || !isRole(payload.role)) return null;
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) return null;
    return payload as SessionPayload & { iat?: number };
  } catch {
    return null;
  }
}

// Sliding session: once the token is older than the renewal age, ask the
// backend for a fresh one (any API call renews it) and pass it to the browser.
async function next(request: NextRequest, session: (SessionPayload & { iat?: number }) | null) {
  const response = NextResponse.next();
  const age = session?.iat ? Date.now() / 1000 - session.iat : 0;
  if (session && age >= SESSION_RENEW_AFTER_SECONDS) {
    try {
      const renewed = await fetch(`${backendUrl()}/api/auth/session`, {
        headers: { cookie: request.headers.get('cookie') ?? '' },
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      });
      for (const cookie of renewed.headers.getSetCookie()) response.headers.append('set-cookie', cookie);
    } catch {
      // Renewal is optional; the current token stays valid until it expires.
    }
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const area = AREA_ROLES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!area) return NextResponse.next();

  const session = unverifiedSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session && area.roles.includes(session.role)) return next(request, session);

  const loginPath = area.roles.length === 1 ? LOGIN_PATH[area.roles[0]] : '/';
  return NextResponse.redirect(new URL(loginPath, request.url));
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/reviewer/:path*',
    '/evaluator/:path*',
    '/sender/:path*',
    '/registration',
    '/report/:path*',
    '/profile',
  ],
};
