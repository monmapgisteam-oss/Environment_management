import { NextResponse } from 'next/server';
import { getApiUser, unauthorized } from '@/lib/auth';
import dataStore from '@/lib/db';
import { fetchCriteriaFor, parseCriterionFields } from '@/lib/reports/criteria';

// Scoring criteria of one report category's sheet: ?category=<report category>.
export async function GET(request: Request) {
  if (!(await getApiUser())) return unauthorized();
  try {
    const category = new URL(request.url).searchParams.get('category');
    return NextResponse.json(await fetchCriteriaFor(category));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch criteria' }, { status: 500 });
  }
}

// Adds a criterion to the end of a category's plan or performance sheet (admin only).
export async function POST(request: Request) {
  if (!(await getApiUser('admin'))) return unauthorized();
  try {
    const data = await request.json();
    const parsed = parseCriterionFields(data);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name, category, maxScore } = parsed.fields as { name: string; category: string; maxScore: number };
    const sheet = data.sheet === 'plan' ? ('plan' as const) : ('performance' as const);
    const last = await dataStore.evaluationCriterion.findFirst({
      where: { category, ...(sheet === 'plan' ? { sheet } : { OR: [{ sheet: null }, { sheet }] }) },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const criterion = await dataStore.evaluationCriterion.create({
      data: { name, category, sheet, maxScore, sortOrder: (last?.sortOrder ?? 0) + 1, isActive: true },
    });
    return NextResponse.json(criterion, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Нэмэхэд алдаа гарлаа' }, { status: 500 });
  }
}
