import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Reverse lookup for the "Тайлан хайх" (Survey123) table — given a
// register number pulled from the raw survey feature, find the matching
// Report(s) in our own DB so staff can jump straight to the score table.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const register = searchParams.get('register')?.trim();
  if (!register) {
    return NextResponse.json({ error: 'register required' }, { status: 400 });
  }

  const reports = await prisma.report.findMany({
    where: {
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
