import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    role: user.role,
    position: user.position,
    phone: user.phone,
    workplace: user.company?.name || null,
  });
}
