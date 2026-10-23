import dataStore from '@/lib/db';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { syncEvaluationToSurvey } from '@/lib/survey/sync';
import { computeDocumentHash, generateSignatureId, hashPin, verifyPin } from '@/lib/auth/signature';
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
      return NextResponse.json({ error: 'Тоон гарын үсгээ зөвхөн тоогоор оруулна уу.' }, { status: 400 });
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

    // Verify the numeric signature against the signer's own registered PIN
    // hash. First-ever signature enrolls the PIN (hashed) since there's no
    // separate PIN-setup flow; every later signature must match it.
    if (current.signaturePinHash) {
      if (!verifyPin(numericSignature, current.signaturePinHash)) {
        return NextResponse.json({ error: 'Гарын үсэг буруу байна.' }, { status: 400 });
      }
    } else {
      await dataStore.user.update({
        where: { id: current.id },
        data: { signaturePinHash: hashPin(numericSignature) },
      });
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
      include: { senderCompany: { include: { users: true } } },
    });

    // Notify the sender and every review manager only when the whole evaluation is complete.
    let notificationIds: string[] = [];
    if (allDone) {
      const senderUsers = updatedReport.senderCompany.users;
      const managers = await dataStore.user.findMany({ where: { role: 'review_manager' } });
      const recipients = [...senderUsers, ...managers];
      notificationIds = await createNotifications(
        recipients.map((u) => ({
          userId: u.id,
          reportId,
          title: 'Үнэлгээ дууссан',
          message: `${updatedReport.reportNumber} тайлангийн үнэлгээ дууссан. Эцсийн оноо: ${avgScore.toFixed(1)}`,
        })),
      );
    }

    // Mirror this evaluator's scores into the survey records of the private
    // Feature Service. Failure-tolerant: it never throws, so a problem here
    // can't break score submission.
    await syncEvaluationToSurvey({
      reportId,
      evaluationId,
      evaluatorName: current.name || 'Үнэлгээ',
    });

    // The survey sync may write to the report too, so read it back last.
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
              pinEnrolled: !current.signaturePinHash,
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
    const message = error instanceof Error ? error.message : 'Failed to submit evaluation';
    return NextResponse.json({ error: message || 'Failed to submit evaluation' }, { status: 500 });
  }
}
