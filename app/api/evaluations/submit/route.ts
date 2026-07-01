import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { syncEvaluationToSurvey } from '@/lib/arcgis';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { reportId, scores, comment, signature } = data;

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const signatureValue = typeof signature === 'string' ? signature.trim() : '';
    if (!signatureValue) {
      return NextResponse.json({ error: 'Тоон гарын үсэг оруулна уу.' }, { status: 400 });
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
    let evaluationId: string;
    if (assignment.evaluation) {
      await prisma.evaluationScore.deleteMany({ where: { evaluationId: assignment.evaluation.id } });
      await prisma.evaluation.update({
        where: { id: assignment.evaluation.id },
        data: {
          totalScore,
          comment: comment || null,
          signature: signatureValue,
          submittedAt: new Date(),
          scores: { create: scoreEntries },
        },
      });
      evaluationId = assignment.evaluation.id;
    } else {
      const created = await prisma.evaluation.create({
        data: {
          assignmentId: assignment.id,
          reportId,
          totalScore,
          comment: comment || null,
          signature: signatureValue,
          submittedAt: new Date(),
          scores: { create: scoreEntries },
        },
      });
      evaluationId = created.id;
    }

    // The report is only finished once EVERY assigned staff member has scored
    // it. The final score (эцсийн оноо) is the arithmetic mean of each
    // evaluator's total score, matching the official scoring sheet.
    const assignments = await prisma.reportAssignment.findMany({
      where: { reportId },
      include: { evaluation: true },
    });
    const submitted = assignments.filter((a) => a.evaluation);
    const allDone = assignments.length > 0 && submitted.length === assignments.length;
    const rawAvg = submitted.length
      ? submitted.reduce((sum, a) => sum + (a.evaluation?.totalScore ?? 0), 0) / submitted.length
      : 0;
    // Round to a single decimal so the stored final score reads cleanly
    // (e.g. 90.6666… → 90.7) everywhere it is displayed.
    const avgScore = Math.round(rawAvg * 10) / 10;

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        // Hold the final score back until all evaluators have weighed in.
        finalScore: allDone ? avgScore : null,
        status: allDone ? 'completed' : 'in_review',
      },
      include: { senderCompany: { include: { users: true } } },
    });

    // Notify the sender and every review manager only when the whole evaluation is complete.
    if (allDone) {
      const senderUsers = updatedReport.senderCompany.users;
      const managers = await prisma.user.findMany({ where: { role: 'review_manager' } });
      const recipients = [...senderUsers, ...managers];
      if (recipients.length > 0) {
        await prisma.notification.createMany({
          data: recipients.map((u) => ({
            userId: u.id,
            reportId,
            title: 'Үнэлгээ дууссан',
            message: `${updatedReport.reportNumber} тайлангийн үнэлгээ дууссан. Эцсийн оноо: ${avgScore.toFixed(1)}`,
          })),
        });
      }
    }

    // Mirror this evaluator's scores into the Survey123 service. Self-contained
    // and failure-tolerant: it no-ops without an API key and never throws, so a
    // problem here can't break score submission.
    await syncEvaluationToSurvey({
      reportId,
      evaluationId,
      evaluatorName: current?.name || 'Үнэлгээ',
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to submit evaluation' }, { status: 500 });
  }
}
