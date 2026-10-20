import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { createToken, isRole, ROLE_HOME, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';

export async function POST(request: Request) {
  const { email, password, allowedRoles } = await request.json();
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string') {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }
  let user;
  try {
    user = await dataStore.user.findUnique({
      where: { email },
      include: { company: true },
    });
  } catch (error) {
    // Usually a missing CONVEX_URL or CONVEX_SERVER_SECRET in the deployment.
    console.error('[auth/login] user lookup failed:', error);
    return NextResponse.json({ error: 'Login service unavailable.' }, { status: 503 });
  }

  if (!user || !verifyPassword(password, user.password) || !isRole(user.role)) {
    return NextResponse.json({ error: 'Имэйл эсвэл нууц үг буруу.' }, { status: 401 });
  }

  // A login portal may allow several roles (e.g. the review organisation lets
  // both the manager and staff in); each is then routed to its own home page.
  const allowed: string[] = Array.isArray(allowedRoles) ? allowedRoles : [];
  if (allowed.length > 0 && !allowed.includes(user.role)) {
    return NextResponse.json({ error: 'Та энэ хэсэгт нэвтрэх эрхгүй байна.' }, { status: 403 });
  }

  const token = createToken({
    userId: user.id,
    role: user.role,
    companyId: user.companyId || undefined,
    companyType: user.company?.type || undefined,
  });

  const response = NextResponse.json({
    success: true,
    role: user.role,
    redirect: ROLE_HOME[user.role],
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
