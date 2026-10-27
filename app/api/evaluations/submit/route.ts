import dataStore from '@/lib/db';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { computeDocumentHash, generateSignatureId, verifyPin } from '@/lib/auth/signature';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';
import { fetchCriteriaForReport } from '@/lib/reports/criteria';
import { createNotifications, createUndoToken } from '@/lib/reports/undo';

async function findOpenAssignment(reportId: string, evaluatorUserId?: string) {
  const assignments = await dataStore.reportAssignment.findMany({
    where: {
      reportId,
      ...(evaluatorUserId ? { evaluatorUserId } : {}),
    },
    include: { evaluation: true },
    orderBy: { assignedAt: 'desc' },
  });

  return (
    assignments.find((assignment) => !assignment.evaluation) ||
    assignments.find((assignment) => assignment.evaluation?.status !== 'SIGNED') ||
    assignments[0] ||
    null
  );
}

async function nextSignatureId(signedAt: Date) {
  const dayStart = new Date(Date.UTC(signedAt.getUTCFullYear(), signedAt.getUTCMonth(), signedAt.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  let sequence = (await dataStore.evaluation.count({ where: { signedAt: { gte: dayStart, lt: dayEnd } } })) + 1;

  for (;;) {
    const signatureId = generateSignatureId(sequence, signedAt);
    const existing = await dataStore.evaluation.findUnique({ where: { signatureId }, select: { id: true } });
    if (!existing) return signatureId;
    sequence += 1;
  }
}

// "Submit" doubles as "Sign & Submit": scoring and signing happen in one
// request (this app has no separate draft-save step). A signed evaluation is
// locked — re-submitting is rejected once status is SIGNED.
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { reportId, scores, notes, comment, signature } = data;

    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const targetReport = await dataStore.report.findUnique({
      where: { id: reportId },
      select: { id: true, title: true, reportCategory: true, status: true, finalScore: true, reportType: { select: { name: true } } },
    });
    if (!targetReport || targetReport.title === GENERAL_EVALUATION_CONCLUSION_TITLE) {
      return NextResponse.json({ error: 'Ерөнхий үнэлгээний дүгнэлт нь үнэлэх тайлан биш.' }, { status: 400 });
    }

    const numericSignature = typeof signature === 'string' ? signature.trim() : '';
    if (!/^\d+$/.test(numericSignature)) {
      return NextResponse.json({ error: 'Гарын үсгийн нууц үгээ зөвхөн тоогоор оруулна уу.' }, { status: 400 });
    }

    // Үндэслэл, тайлбар written for each criterion.
    const noteFor = (criterionId: string) => {
      const value = notes && typeof notes === 'object' ? (notes as Record<string, unknown>)[criterionId] : null;
      return typeof value === 'string' ? value.trim().slice(0, 2000) : '';
    };
    const scoreEntries = Object.entries(scores || {})
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .map(([criterionId, score]) => ({
        criterionId,
        score: parseInt(score as string) || 0,
        note: noteFor(criterionId),
      }))
      .sort((a, b) => a.criterionId.localeCompare(b.criterionId));

    const totalScore = scoreEntries.reduce((sum, s) => sum + s.score, 0);

    const current = await getCurrentUser();
    if (!current) {
      return NextResponse.json({ error: 'Нэвтрээгүй байна.' }, { status: 401 });
    }
    if (current.role !== 'evaluator' && current.role !== 'review_manager') {
      return NextResponse.json({ error: 'Үнэлгээ өгөх эрхгүй байна.' }, { status: 403 });
    }

    // A staff member scores their own assignment; a manager falls back to any
    // unevaluated assignment (creating one if needed).
    let assignment;
    let assignmentCreated = false;
    if (current.role === 'evaluator') {
      const alreadySigned = await dataStore.reportAssignment.findFirst({
        where: {
          reportId,
          evaluatorUserId: current.id,
          evaluation: { status: 'SIGNED' },
        },
        include: { evaluation: true },
      });
      if (alreadySigned) {
        return NextResponse.json({ error: 'Гарын үсгээр баталгаажсан тул засах боломжгүй.' }, { status: 403 });
      }
      assignment = await findOpenAssignment(reportId, current.id);
      if (!assignment) {
        return NextResponse.json({ error: 'Танд энэ тайлан оноогдоогүй байна.' }, { status: 403 });
      }
    } else {
      assignment = await findOpenAssignment(reportId);
      if (assignment?.evaluation?.status === 'SIGNED') assignment = null;
      if (!assignment) {
        const manager = await dataStore.user.findFirst({ where: { role: 'review_manager' } });
        if (!manager) {
          return NextResponse.json({ error: 'No review manager found' }, { status: 500 });
        }
        assignment = await dataStore.reportAssignment.create({
          data: {
            reportId,
            evaluatorUserId: manager.id,
            assignedByUserId: manager.id,
            status: 'submitted',
          },
          include: { evaluation: true },
        });
        assignmentCreated = true;
      }
    }

    // A signed score is locked — the backend enforces this even if a stale
    // frontend still lets someone click submit.
    if (assignment.evaluation?.status === 'SIGNED') {
      return NextResponse.json({ error: 'Гарын үсгээр баталгаажсан тул засах боломжгүй.' }, { status: 403 });
    }

    // Every criterion on the report category's sheet must be scored, within its
    // maximum, before a signature can be applied.
    // The plan or performance sheet of this report.
    const criteria = await fetchCriteriaForReport(targetReport);
    const maxScoreById = new Map(criteria.map((c) => [c.id, c.maxScore]));
    const scoredIds = new Set(scoreEntries.map((s) => s.criterionId));
    const complete = maxScoreById.size > 0 && [...maxScoreById.keys()].every((id) => scoredIds.has(id));
    if (!complete) {
      return NextResponse.json({ error: 'Бүх шалгуураар оноо оруулна уу.' }, { status: 400 });
    }
    const outOfRange = scoreEntries.some((s) => {
      const maxScore = maxScoreById.get(s.criterionId);
      return maxScore === undefined || s.score < 0 || s.score > maxScore;
    });
    if (outOfRange) {
      return NextResponse.json({ error: 'Оноо шалгуурын авбал зохих онооноос хэтэрсэн байна.' }, { status: 400 });
    }
    if (scoreEntries.some((s) => !s.note)) {
      return NextResponse.json({ error: 'Шалгуур бүрийн үндэслэл, тайлбарыг бичнэ үү.' }, { status: 400 });
    }

    // Verify the signature password the system issued to this signer (admin
    // creates or reissues it). Nobody can sign without one.
    if (!current.signaturePinHash) {
      return NextResponse.json(
        { error: 'Танд тоон гарын үсэг олгогдоогүй байна. Админд хандаж гарын үсгийн нууц үгээ авна уу.' },
        { status: 400 },
      );
    }
    if (!verifyPin(numericSignature, current.signaturePinHash)) {
      return NextResponse.json({ error: 'Гарын үсгийн нууц үг буруу байна.' }, { status: 400 });
    }

    const signedAt = new Date();
    const signatureId = await nextSignatureId(signedAt);

    // Fixed, signed payload — a tamper-evident fingerprint of exactly what was
    // scored and by whom, safe to expose (it's a hash, not the scores raw).
    const documentHash = computeDocumentHash({
      reportId,
      assignmentId: assignment.id,
      evaluatorUserId: assignment.evaluatorUserId,
      scores: scoreEntries,
      totalScore,
      signedAt: signedAt.toISOString(),
    });

    const assignmentBefore = { status: assignment.status, submittedAt: assignment.submittedAt };
    // Undo removes the evaluation, so it is offered only when this request
    // creates it (not for an older unsigned evaluation being re-scored).
    const evaluationExisted = Boolean(assignment.evaluation);
    await dataStore.reportAssignment.update({
      where: { id: assignment.id },
      data: { status: 'submitted', submittedAt: signedAt },
    });

    const signedFields = {
      totalScore,
      comment: comment || null,
      // The PIN is verified against the user's hash above and never stored.
      signature: null,
      status: 'SIGNED',
      signatureStatus: 'VERIFIED',
      signedAt,
      signatureId,
      documentHash,
      lockedAt: signedAt,
      submittedAt: signedAt,
    };

    // Re-scoring updates the existing (unsigned) evaluation; otherwise create a new one.
    let evaluationId: string;
    if (assignment.evaluation) {
      await dataStore.evaluationScore.deleteMany({ where: { evaluationId: assignment.evaluation.id } });
      await dataStore.evaluation.update({
        where: { id: assignment.evaluation.id },
        data: { ...signedFields, scores: { create: scoreEntries } },
      });
      evaluationId = assignment.evaluation.id;
    } else {
      const created = await dataStore.evaluation.create({
        data: { assignmentId: assignment.id, reportId, ...signedFields, scores: { create: scoreEntries } },
      });
      evaluationId = created.id;
    }

    // The report is only finished once EVERY assigned staff member has signed
    // off. The final score (эцсийн оноо) is the arithmetic mean of each
    // signed, verified evaluator's total score — unsigned scores never count.
    const assignments = await dataStore.reportAssignment.findMany({
      where: { reportId },
      include: { evaluation: true },
    });
    const uniqueAssignments = uniqueAssignmentsByEvaluator(assignments);
    const signed = uniqueAssignments.filter((a) => a.evaluation?.status === 'SIGNED' && a.evaluation?.signatureStatus === 'VERIFIED');
    const allDone = uniqueAssignments.length > 0 && signed.length === uniqueAssignments.length;
    const rawAvg = signed.length
      ? signed.reduce((sum, a) => sum + (a.evaluation?.totalScore ?? 0), 0) / signed.length
      : 0;
    // Round to a single decimal so the stored final score reads cleanly
    // (e.g. 90.6666… → 90.7) everywhere it is displayed.
    const avgScore = Math.round(rawAvg * 10) / 10;

    const updatedReport = await dataStore.report.update({
      where: { id: reportId },
      data: {
        // Hold the final score back until all evaluators have signed off.
        finalScore: allDone ? avgScore : null,
        status: allDone ? 'completed' : 'in_review',
      },
    });

    // Once every evaluator has signed, the managers are asked to check the
    // scores and sign them off. The sender hears nothing yet: scores reach
    // them only after the manager's approval (api/reports/[id]/approve-scores).
    let notificationIds: string[] = [];
    if (allDone) {
      const managers = await dataStore.user.findMany({ where: { role: 'review_manager' } });
      notificationIds = await createNotifications(
        managers.map((u) => ({
          userId: u.id,
          reportId,
          title: 'Үнэлгээ баталгаажуулалт хүлээж байна',
          message: `${updatedReport.reportNumber} тайлангийн бүх гишүүн гарын үсгээр үнэлгээгээ баталгаажууллаа. Шалгаад тоон гарын үсгээр баталгаажуулна уу. Дундаж оноо: ${avgScore.toFixed(1)}`,
        })),
      );
    }

    const finalReport = await dataStore.report.findUnique({ where: { id: reportId }, select: { updatedAt: true } });
    const undoToken =
      evaluationExisted || !finalReport
        ? null
        : createUndoToken(
            {
              kind: 'evaluation',
              reportId,
              evaluationId,
              assignmentId: assignment.id,
              assignmentCreated,
              notificationIds,
              prev: {
                assignmentStatus: assignmentBefore.status,
                assignmentSubmittedAt: assignmentBefore.submittedAt ? new Date(assignmentBefore.submittedAt).getTime() : null,
                reportStatus: targetReport.status,
                finalScore: targetReport.finalScore,
              },
            },
            current.id,
            finalReport.updatedAt,
          );

    // Safe response only — never the raw numeric signature/PIN.
    return NextResponse.json(
      {
        success: true,
        status: 'SIGNED',
        signatureStatus: 'VERIFIED',
        signedAt: signedAt.toISOString(),
        signatureId,
        undoToken,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    // Details stay in the server log; the browser gets a plain message.
    return NextResponse.json({ error: 'Үнэлгээ хадгалахад алдаа гарлаа. Дахин оролдоно уу.' }, { status: 500 });
  }
}
