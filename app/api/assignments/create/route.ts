import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const evaluators = data.evaluators || [];
    const assignments = await Promise.all(
      evaluators.map((evaluatorId: string) =>
        prisma.reportAssignment.create({
          data: {
            reportId: data.reportId,
            evaluatorUserId: evaluatorId,
            assignedByUserId: data.assignedByUserId,
            status: 'pending',
            deadline: data.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
      ),
    );

    await prisma.report.update({
      where: { id: data.reportId },
      data: { status: 'assigned' },
    });

    return NextResponse.json(assignments, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to assign evaluators' }, { status: 500 });
  }
}
