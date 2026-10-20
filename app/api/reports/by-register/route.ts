import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

// Reverse lookup for the "Тайлан хайх" (Survey123) table — given a
// register number pulled from the raw survey feature, find the matching
// Report(s) in our own DB so staff can jump straight to the score table.
export async function GET(request: Request) {
  if (!(await getApiUser('review_manager', 'evaluator'))) return unauthorized();
  const { searchParams } = new URL(request.url);
  const register = searchParams.get('register')?.trim();
  if (!register) {
    return NextResponse.json({ error: 'register required' }, { status: 400 });
  }

  const reports = await dataStore.report.findMany({
    where: {
      title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
      OR: [{ implementerRegister: register }, { senderCompany: { registerNumber: register } }],
    },
    select: {
      id: true,
      reportNumber: true,
      title: true,
      status: true,
      reportType: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ reports });
}
