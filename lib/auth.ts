import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'tailan-demo-secret-change-me';
const COOKIE_NAME = 'tailan_session';

export type SessionPayload = {
  userId: string;
  role: string;
  companyId?: string;
  companyType?: string;
};

export function createToken(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { company: true },
  });
  return user ? { ...user, company: user.company } : null;
}
