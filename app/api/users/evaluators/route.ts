import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const evaluators = await prisma.user.findMany({
      where: { role: 'evaluator' },
      select: { id: true, name: true, position: true },
    });
    return NextResponse.json(evaluators);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch evaluators' }, { status: 500 });
  }
}
