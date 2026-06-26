import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { reportId, scores, comment } = data;

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const scoreEntries = Object.entries(scores || {})
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .map(([criterionId, score]) => ({
        criterionId,
        score: parseInt(score as string) || 0,
      }));

    const totalScore = scoreEntries.reduce((sum, s) => sum + s.score, 0);

    const current = await getCurrentUser();

    // A staff member scores their own assignment; a manager falls back to any
    // unevaluated assignment (creating one if needed).
    let assignment;
    if (current?.role === 'evaluator') {
      assignment = await prisma.reportAssignment.findFirst({
        where: { reportId, evaluatorUserId: current.id },
        include: { evaluation: true },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'Танд энэ тайлан оноогдоогүй байна.' }, { status: 403 });
      }
    } else {
      assignment = await prisma.reportAssignment.findFirst({
        where: { reportId, evaluation: null },
        include: { evaluation: true },
      });
      if (!assignment) {
        const manager = await prisma.user.findFirst({ where: { role: 'review_manager' } });
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
          include: { evaluation: true },
        });
      }
    }

    await prisma.reportAssignment.update({
      where: { id: assignment.id },
      data: { status: 'submitted', submittedAt: new Date() },
    });

    // Re-scoring updates the existing evaluation; otherwise create a new one.
    if (assignment.evaluation) {
      await prisma.evaluationScore.deleteMany({ where: { evaluationId: assignment.evaluation.id } });
      await prisma.evaluation.update({
        where: { id: assignment.evaluation.id },
        data: {
          totalScore,
          comment: comment || null,
          submittedAt: new Date(),
          scores: { create: scoreEntries },
        },
      });
    } else {
      await prisma.evaluation.create({
        data: {
          assignmentId: assignment.id,
          reportId,
          totalScore,
          comment: comment || null,
          submittedAt: new Date(),
          scores: { create: scoreEntries },
        },
      });
    }

    // Report final score = average across all submitted evaluations.
    const allEvaluations = await prisma.evaluation.findMany({ where: { reportId } });
    const avgScore = allEvaluations.reduce((sum, e) => sum + e.totalScore, 0) / (allEvaluations.length || 1);

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: { finalScore: avgScore, status: 'completed' },
      include: { senderCompany: { include: { users: true } } },
    });

    // Notify the sender company that the report has been scored.
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

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to submit evaluation' }, { status: 500 });
  }
}
