import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import dataStore from './arcgis/data';

function sessionSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required.');
  return process.env.JWT_SECRET;
}
const COOKIE_NAME = 'tailan_session';

export type SessionPayload = {
  userId: string;
  role: string;
  companyId?: string;
  companyType?: string;
};

export function createToken(payload: SessionPayload) {
  return jwt.sign(payload, sessionSecret(), { expiresIn: '8h', audience: 'tailan-session' });
}

export function verifyToken(token: string) {
  try {
    const payload = jwt.verify(token, sessionSecret(), { audience: 'tailan-session' });
    if (typeof payload === 'string' || typeof payload.userId !== 'string' || !payload.userId || typeof payload.role !== 'string') return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await dataStore.user.findUnique({
    where: { id: payload.userId },
    include: { company: true },
  });
  return user ? { ...user, company: user.company } : null;
}
