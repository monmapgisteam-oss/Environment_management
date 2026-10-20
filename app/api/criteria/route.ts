import { NextResponse } from 'next/server';
import { getApiUser, unauthorized } from '@/lib/auth';
import { fetchCriteriaFor } from '@/lib/reports/criteria';

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
