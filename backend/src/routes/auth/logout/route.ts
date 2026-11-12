import { cookies, NextResponse } from '@/http/next';
import { SESSION_COOKIE, verifyToken } from '@/lib/auth/session';
import { revokeAllSessions, revokeSession } from '@/lib/auth/revocation';
import { getCurrentUser } from '@/lib/auth';
import { securityEvent } from '@/lib/securityLog';

// Signs out. The session also ends on the server, so a copy of the cookie
// (another device, a shared computer) stops working too. With
// { "everywhere": true } every session of the user ends, on all devices.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = token ? verifyToken(token) : null;
  try {
    if (payload && body?.everywhere === true) {
      const user = await getCurrentUser({ allowPendingPassword: true, allowUnapprovedCompany: true });
      if (user) {
        await revokeAllSessions(user.id);
        securityEvent('logout.everywhere', { userId: user.id });
      }
    } else if (payload) {
      await revokeSession(payload);
      securityEvent('logout', { userId: payload.userId });
    }
  } catch (error) {
    // The cookie is still cleared; the token then ends at its expiry.
    console.error('[auth/logout] could not end the session on the server:', error);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
