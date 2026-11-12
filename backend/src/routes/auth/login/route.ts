import { NextResponse } from '@/http/next';
import dataStore from '@/lib/db';
import { createToken, isRole, REGISTRATION_PATH, ROLE_HOME, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { passwordVersion, verifyDummyPassword, verifyPassword } from '@/lib/auth/password';
import { clientIp, limitRequest } from '@/lib/auth/rateLimit';
import { withKeyLock } from '@/lib/auth/keyedLock';
import { isActiveUser, isCompanyApproved } from '@shared/auth/accounts';

// Brute-force guard: attempts per address, and failed attempts per account
// (a successful login never counts, so others can't lock a user out by
// logging in correctly; only repeated wrong passwords do).
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPTS_PER_ADDRESS = 30;
// Failed attempts at one account from one address, and from all addresses.
// The per-address limit stops guessing; the much higher overall limit stops a
// spread-out attack without letting one stranger lock the owner out.
const FAILURES_PER_EMAIL_AND_ADDRESS = 10;
const FAILURES_PER_EMAIL = 100;

const emailKey = (email: string) => `login:email:${email.trim().toLowerCase()}`;
const emailAddressKey = (email: string, address: string) => `login:email-ip:${email.trim().toLowerCase()}:${address}`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { email, password, allowedRoles } = body ?? {};
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string') {
    return NextResponse.json({ error: 'Имэйл болон нууц үгээ оруулна уу.' }, { status: 400 });
  }
  const address = clientIp(request);
  const byAddress = await limitRequest(`login:ip:${address}`, ATTEMPTS_PER_ADDRESS, ATTEMPT_WINDOW_MS);
  // One check at a time per account, so parallel guesses cannot all pass the
  // failure counters before any failure is recorded.
  const outcome = await withKeyLock(emailKey(email), async () => {
    const [byEmailAndAddress, byEmail] = await Promise.all([
      limitRequest(emailAddressKey(email, address), FAILURES_PER_EMAIL_AND_ADDRESS, ATTEMPT_WINDOW_MS, { count: false }),
      limitRequest(emailKey(email), FAILURES_PER_EMAIL, ATTEMPT_WINDOW_MS, { count: false }),
    ]);
    if (!byAddress.ok || !byEmailAndAddress.ok || !byEmail.ok) {
      const retryAfter = Math.max(byAddress.retryAfterSeconds, byEmailAndAddress.retryAfterSeconds, byEmail.retryAfterSeconds);
      return { response: NextResponse.json(
        { error: 'Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      ) };
    }
    let found;
    try {
      found = await dataStore.user.findUnique({
        where: { email },
        include: { company: true },
      });
    } catch (error) {
      // Usually missing ARCGIS_* settings in the deployment or an unreachable service.
      console.error('[auth/login] user lookup failed:', error);
      return { response: NextResponse.json({ error: 'Нэвтрэх үйлчилгээ түр ажиллахгүй байна. Дахин оролдоно уу.' }, { status: 503 }) };
    }

    const passwordOk = found ? verifyPassword(password, found.password) : verifyDummyPassword(password);
    if (!found || !passwordOk || !isRole(found.role)) {
      await Promise.all([
        limitRequest(emailAddressKey(email, address), FAILURES_PER_EMAIL_AND_ADDRESS, ATTEMPT_WINDOW_MS),
        limitRequest(emailKey(email), FAILURES_PER_EMAIL, ATTEMPT_WINDOW_MS),
      ]);
      return { response: NextResponse.json({ error: 'Имэйл эсвэл нууц үг буруу.' }, { status: 401 }) };
    }
    return { user: found };
  });
  if (outcome.response) return outcome.response;
  const user = outcome.user;
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
