import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { computeDocumentHash, generateSignatureId, verifyPin } from '@/lib/auth/signature';
import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';
import { createNotifications } from '@/lib/reports/undo';
import { formatScore } from '@/lib/utils';

async function nextApprovalId(at: Date) {
  const dayStart = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  let sequence = (await dataStore.report.count({ where: { scoresApprovedAt: { gte: dayStart, lt: dayEnd } } })) + 1;

  for (;;) {
    const signatureId = generateSignatureId(sequence, at, 'BAT');
    const existing = await dataStore.report.findFirst({ where: { scoresApprovalSignatureId: signatureId }, select: { id: true } });
    if (!existing) return signatureId;
    sequence += 1;
  }
}

// The manager checks every evaluator's signed scores and signs the whole set
// with their own digital signature password. Only then are the scores
// released to the sender (lib/reports/scoreRelease.ts), who is notified here.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const manager = await getApiUser('review_manager');
  if (!manager) return unauthorized();
  const { id } = await props.params;

  try {
    const body = (await request.json().catch(() => null)) ?? {};
    const pin = typeof body.signature === 'string' ? body.signature.trim() : '';
    if (!/^\d+$/.test(pin)) {
      return NextResponse.json({ error: 'Гарын үсгийн нууц үгээ оруулна уу.' }, { status: 400 });
    }

    const report = await dataStore.report.findUnique({
      where: { id },
      include: {
        senderCompany: { include: { users: { select: { id: true } } } },
        assignments: { include: { evaluation: true }, orderBy: { assignedAt: 'desc' } },
      },
    });
    if (!report) return NextResponse.json({ error: 'Тайлан олдсонгүй.' }, { status: 404 });
    if (report.scoresApprovedAt) {
      return NextResponse.json({ error: 'Үнэлгээ аль хэдийн баталгаажсан байна.' }, { status: 409 });
    }

    // Every assigned evaluator must have signed their scores first.
    const assignments = uniqueAssignmentsByEvaluator(report.assignments);
    const signed = assignments.flatMap(({ evaluatorUserId, evaluation }) =>
      evaluation?.status === 'SIGNED' && evaluation.signatureStatus === 'VERIFIED' ? [{ evaluatorUserId, evaluation }] : [],
    );
    if (report.status !== 'completed' || assignments.length === 0 || signed.length !== assignments.length || report.finalScore == null) {
      return NextResponse.json({ error: 'Бүх гишүүн гарын үсгээр үнэлгээгээ баталгаажуулаагүй байна.' }, { status: 400 });
    }

    if (!manager.signaturePinHash) {
      return NextResponse.json(
        { error: 'Танд тоон гарын үсэг олгогдоогүй байна. Админд хандаж гарын үсгийн нууц үгээ авна уу.' },
        { status: 400 },
      );
    }
    if (!verifyPin(pin, manager.signaturePinHash)) {
      return NextResponse.json({ error: 'Гарын үсгийн нууц үг буруу байна.' }, { status: 400 });
    }

    const approvedAt = new Date();
    const signatureId = await nextApprovalId(approvedAt);
    // Fingerprint of exactly what the manager approved: each evaluator's own
    // signature and the final score.
    const documentHash = computeDocumentHash({
      reportId: report.id,
      finalScore: report.finalScore,
      evaluations: signed
        .map(({ evaluatorUserId, evaluation }) => ({
          evaluatorUserId,
          signatureId: evaluation.signatureId,
          documentHash: evaluation.documentHash,
          totalScore: evaluation.totalScore,
        }))
        .sort((a, b) => a.evaluatorUserId.localeCompare(b.evaluatorUserId)),
      approvedById: manager.id,
      approvedAt: approvedAt.toISOString(),
    });

    await dataStore.report.update({
      where: { id: report.id },
      data: {
        status: 'approved',
        scoresApprovedAt: approvedAt,
        scoresApprovedById: manager.id,
        scoresApprovalSignatureId: signatureId,
        scoresApprovalDocumentHash: documentHash,
      },
    });

    try {
      await createNotifications(
        report.senderCompany.users.map((u) => ({
          userId: u.id,
          reportId: report.id,
          title: 'Үнэлгээ баталгаажлаа',
          message: `${report.reportNumber} тайлангийн үнэлгээг менежер баталгаажууллаа. Эцсийн оноо: ${formatScore(report.finalScore)}`,
        })),
      );
    } catch (notifyError) {
      console.error('[approve-scores] notify failed:', notifyError);
    }

    // Safe response only — never the PIN.
    return NextResponse.json({ success: true, signatureId, approvedAt: approvedAt.toISOString() });
  } catch (error) {
    console.error('[approve-scores] failed:', error);
    return NextResponse.json({ error: 'Баталгаажуулахад алдаа гарлаа. Дахин оролдоно уу.' }, { status: 500 });
  }
}
