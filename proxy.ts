import { NextResponse, type NextRequest } from 'next/server';
import { LOGIN_PATH, SESSION_COOKIE, verifyToken, type Role } from '@/lib/auth/session';

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const area = AREA_ROLES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!area) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifyToken(token) : null;
  if (session && area.roles.includes(session.role)) return NextResponse.next();

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
