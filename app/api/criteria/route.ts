import dataStore from '@/lib/arcgis/data';
import { NextResponse } from 'next/server';

export async function GET() {
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
