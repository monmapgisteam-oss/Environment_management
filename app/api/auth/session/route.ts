import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Who this browser is signed in as right now. Open pages compare it with the
// user they were rendered for (components/layout/SessionGuard.tsx), so a
// sign-in in another tab is noticed before it causes confusing errors.
export async function GET() {
  const user = await getCurrentUser({ allowPendingPassword: true, allowUnapprovedCompany: true });
  return NextResponse.json({ userId: user?.id ?? null, name: user?.name ?? null });
}
