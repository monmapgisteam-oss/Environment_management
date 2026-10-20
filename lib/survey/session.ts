import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifyToken } from '@/lib/auth/session';

// Survey data is private: only signed-in users may read it through the app.
export async function hasSurveySession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return !!token && !!verifyToken(token);
}
