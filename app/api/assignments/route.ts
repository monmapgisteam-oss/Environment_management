import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { ACTIVE_USER_WHERE } from '@/lib/auth/accounts';

// What the "Гишүүдэд оноох" dialog needs to open anywhere: every staff member
// and who is already assigned to the report.
export async function GET(request: Request) {
  if (!(await getApiUser('review_manager'))) return unauthorized();
  const reportId = new URL(request.url).searchParams.get('reportId') || '';
  if (!reportId) return NextResponse.json({ error: 'reportId is required' }, { status: 400 });

  const [staff, assignments] = await Promise.all([
    dataStore.user.findMany({
      where: { role: 'evaluator', ...ACTIVE_USER_WHERE },
      select: { id: true, name: true, position: true },
      orderBy: { name: 'asc' },
    }),
    dataStore.reportAssignment.findMany({ where: { reportId }, select: { evaluatorUserId: true } }),
  ]);

  return NextResponse.json({
    staff,
    assigneeIds: Array.from(new Set(assignments.map((assignment) => assignment.evaluatorUserId))),
  });
}
