import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { reportId, scores, comment } = data;

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const scoreEntries = Object.entries(scores)
      .filter(([, value]) => value !== '')
      .map(([criterionId, score]) => ({
        criterionId,
        score: parseInt(score as string) || 0,
      }));

    const totalScore = scoreEntries.reduce((sum, s) => sum + s.score, 0);

    // Find an existing assignment without evaluation, or create one
    let assignment = await prisma.reportAssignment.findFirst({
      where: {
        reportId,
        evaluation: null,
      },
    });

    if (!assignment) {
      // Find any user to use as evaluator/assigner (fallback)
      const manager = await prisma.user.findFirst({
        where: { role: 'review_manager' },
      });

      if (!manager) {
        return NextResponse.json({ error: 'No review manager found' }, { status: 500 });
      }

      assignment = await prisma.reportAssignment.create({
        data: {
          reportId,
          evaluatorUserId: manager.id,
          assignedByUserId: manager.id,
          status: 'submitted',
        },
      });
    } else {
      await prisma.reportAssignment.update({
        where: { id: assignment.id },
        data: { status: 'submitted', submittedAt: new Date() },
      });
    }

    // Create evaluation linked to the assignment and report
    const evaluation = await prisma.evaluation.create({
      data: {
        assignmentId: assignment.id,
        reportId,
        totalScore,
        comment: comment || null,
        submittedAt: new Date(),
        scores: {
          create: scoreEntries,
        },
      },
    });

    // Update report finalScore (average of all evaluations for this report)
    const allEvaluations = await prisma.evaluation.findMany({
      where: { reportId },
    });

    const avgScore = allEvaluations.reduce((sum, e) => sum + e.totalScore, 0) / allEvaluations.length;

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        finalScore: avgScore,
        status: 'completed',
      },
      include: { senderCompany: { include: { users: true } } },
    });

    // Send notification to all sender company users
    const senderUsers = updatedReport.senderCompany.users;
    if (senderUsers.length > 0) {
      await prisma.notification.createMany({
        data: senderUsers.map((user) => ({
          userId: user.id,
          reportId,
          title: 'Үнэлгээ дууссан',
          message: `${updatedReport.reportNumber} тайлангийн үнэлгээ дууссан. Нийт оноо: ${totalScore}`,
        })),
      });
    }

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to submit evaluation' }, { status: 500 });
  }
}
