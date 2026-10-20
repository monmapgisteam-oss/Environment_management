import dataStore from '@/lib/db';
import { NextResponse } from 'next/server';
import { getApiUser, unauthorized } from '@/lib/auth';

export async function GET() {
  if (!(await getApiUser())) return unauthorized();
  try {
    const criteria = await dataStore.evaluationCriterion.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(criteria);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch criteria' }, { status: 500 });
  }
}
