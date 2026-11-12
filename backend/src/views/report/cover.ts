import dataStore from '@/lib/db';
import { canAccessReport } from '@/lib/auth';
import { createQrImageUrl, getPublicProfileQrUrl } from '@/lib/auth/profileQr';
import { uniqueAssignmentsByEvaluator } from '@shared/reports/assignments';
import { scoresReleased } from '@shared/reports/scoreRelease';
import type { CoverSigner } from '@shared/views/report';
import { defineView } from '../define';

async function fetchReport(reportId: string) {
  return dataStore.report.findUnique({
    where: { id: reportId },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: {
        include: {
          evaluator: true,
          evaluation: true,
        },
        orderBy: { assignedAt: 'asc' },
      },
    },
  });
}

async function personWithQr(user: { id: string; name: string; position: string | null; role: string }, signedAt: Date | null): Promise<CoverSigner> {
  return {
    signedAt: signedAt ? signedAt.toISOString() : null,
    id: user.id,
    name: user.name,
    roleLabel: user.role === 'review_manager' ? 'Хянах менежер' : 'Үнэлгээний ажилтан',
    position: user.position || (user.role === 'review_manager' ? 'Хянах менежер' : 'Үнэлгээний ажилтан'),
    qrUrl: await createQrImageUrl(await getPublicProfileQrUrl(user.id), 180),
  };
}

// The printed cover is for the receiving side only (the page tells anyone
// else so before loading this view).
export default defineView({
  name: 'report/:id/cover',
  roles: ['review_manager', 'evaluator'],
  async load({ user: currentUser, params }) {
    const report = await fetchReport(params.id);
    if (!report || !(await canAccessReport(currentUser, report))) return null;

    // Signatures come from the workflow itself: each evaluator's signed scores
    // and the manager who approved them.
    // Until the manager releases the scores, a staff member's cover shows only
    // their own signature and no combined score: colleagues stay anonymous.
    const released = scoresReleased(report);
    const staffOnlySelf = currentUser.role === 'evaluator' && !released;
    const uniqueAssignments = uniqueAssignmentsByEvaluator(report.assignments).filter(
      (assignment) => assignment.evaluator && (!staffOnlySelf || assignment.evaluator.id === currentUser.id),
    );
    const approver = report.scoresApprovedById
      ? await dataStore.user.findUnique({ where: { id: report.scoresApprovedById } })
      : null;
    const [staff, manager] = await Promise.all([
      Promise.all(
        uniqueAssignments.map((assignment) =>
          personWithQr(
            assignment.evaluator,
            assignment.evaluation?.status === 'SIGNED' && assignment.evaluation.signatureStatus === 'VERIFIED'
              ? assignment.evaluation.signedAt
              : null,
          ),
        ),
      ),
      approver && report.scoresApprovedAt ? personWithQr(approver, report.scoresApprovedAt) : Promise.resolve(null),
    ]);

    return {
      report: {
        reportNumber: report.reportNumber,
        title: report.title,
        submittedAt: report.submittedAt,
        implementerName: report.implementerName,
        implementerRegister: report.implementerRegister,
        approvedDate: report.approvedDate,
        description: report.description,
        finalScore: staffOnlySelf ? null : report.finalScore,
        reportType: { name: report.reportType.name },
        senderCompany: report.senderCompany
          ? { name: report.senderCompany.name, registerNumber: report.senderCompany.registerNumber }
          : null,
        location: report.location
          ? {
              province: report.location.province,
              district: report.location.district,
              khoroo: report.location.khoroo,
              addressDetail: report.location.addressDetail,
            }
          : null,
      },
      staff,
      manager,
    };
  },
});
