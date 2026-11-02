import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { createToken, isRole, REGISTRATION_PATH, ROLE_HOME, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { passwordVersion, verifyDummyPassword, verifyPassword } from '@/lib/auth/password';
import { clientIp, limitRequest } from '@/lib/auth/rateLimit';
import { isActiveUser, isCompanyApproved } from '@/lib/auth/accounts';

// Brute-force guard: attempts per address, and failed attempts per account
// (a successful login never counts, so others can't lock a user out by
// logging in correctly; only repeated wrong passwords do).
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPTS_PER_EMAIL = 10;
const ATTEMPTS_PER_ADDRESS = 30;

const emailKey = (email: string) => `login:email:${email.trim().toLowerCase()}`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { email, password, allowedRoles } = body ?? {};
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string') {
    return NextResponse.json({ error: 'Имэйл болон нууц үгээ оруулна уу.' }, { status: 400 });
  }
  const [byAddress, byEmail] = await Promise.all([
    limitRequest(`login:ip:${clientIp(request)}`, ATTEMPTS_PER_ADDRESS, ATTEMPT_WINDOW_MS),
    limitRequest(emailKey(email), ATTEMPTS_PER_EMAIL, ATTEMPT_WINDOW_MS, { count: false }),
  ]);
  if (!byAddress.ok || !byEmail.ok) {
    const retryAfter = Math.max(byAddress.retryAfterSeconds, byEmail.retryAfterSeconds);
    return NextResponse.json(
      { error: 'Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }
  let user;
  try {
    user = await dataStore.user.findUnique({
      where: { email },
      include: { company: true },
    });
  } catch (error) {
    // Usually missing ARCGIS_* settings in the deployment or an unreachable service.
    console.error('[auth/login] user lookup failed:', error);
    return NextResponse.json({ error: 'Нэвтрэх үйлчилгээ түр ажиллахгүй байна. Дахин оролдоно уу.' }, { status: 503 });
  }

  const passwordOk = user ? verifyPassword(password, user.password) : verifyDummyPassword(password);
  if (!user || !passwordOk || !isRole(user.role)) {
    await limitRequest(emailKey(email), ATTEMPTS_PER_EMAIL, ATTEMPT_WINDOW_MS);
    return NextResponse.json({ error: 'Имэйл эсвэл нууц үг буруу.' }, { status: 401 });
  }
  if (!isActiveUser(user)) {
    return NextResponse.json({ error: 'Таны эрх идэвхгүй болсон байна. Системийн админд хандана уу.' }, { status: 403 });
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
    pv: passwordVersion(user.password),
  });

  const response = NextResponse.json({
    success: true,
    role: user.role,
    // A sender whose company is not approved yet sees only the registration page.
    redirect: user.role === 'sender' && !isCompanyApproved(user.company) ? REGISTRATION_PATH : ROLE_HOME[user.role],
    // The app asks for a new password right after this login.
    mustChangePassword: !!user.mustChangePassword,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
