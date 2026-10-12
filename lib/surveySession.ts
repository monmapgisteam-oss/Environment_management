import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// Survey data is private: only signed-in users may read it through the app.
export async function hasSurveySession(): Promise<boolean> {
  const token = (await cookies()).get('tailan_session')?.value;
  return !!token && !!verifyToken(token);
}
