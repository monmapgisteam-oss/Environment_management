import dataStore from '@/lib/db';
import { fetchCriteriaForReport } from '@/lib/reports/criteria';
import { parseAttachments } from '@shared/reports/attachments';
import { signAttachments } from '@/lib/db/storage';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { criteriaSections } from '@shared/reports/revisions';
import { signSections } from '@/lib/reports/reportSections';
import { canTransition } from '@/lib/reports/transitions';
import { defineView } from '../define';

async function findStaffAssignment(reportId: string, evaluatorUserId: string) {
  const assignments = await dataStore.reportAssignment.findMany({
    where: { reportId, evaluatorUserId, report: { title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } } },
    include: {
      report: {
        include: { reportType: true, senderCompany: true, location: true },
      },
      evaluation: { include: { scores: true } },
    },
    orderBy: { assignedAt: 'desc' },
  });

  return (
    assignments.find((assignment) => assignment.evaluation?.status === 'SIGNED') ||
    assignments.find((assignment) => !assignment.evaluation) ||
    assignments.find((assignment) => assignment.evaluation?.status !== 'SIGNED') ||
    assignments[0] ||
    null
  );
}

export default defineView({
  name: 'evaluator/evaluate/:id',
  roles: ['evaluator'],
  async load({ user, params }) {
    // A staff member may only score a report the manager assigned to them.
    const assignment = await findStaffAssignment(params.id, user.id);
    if (!assignment) return { assigned: false };

    const report = (await attachEffectiveSenderCompanies([assignment.report]))[0];
    const criteria = await fetchCriteriaForReport(report);
    const tableCriteria = criteria.map((c) => ({
      id: c.id,
      name: c.name,
      maxScore: c.maxScore,
      sortOrder: c.sortOrder,
      sheet: c.sheet,
    }));
    const attachments = await signAttachments(parseAttachments(report.fileUrl));
    // The criteria the evaluator can point at when returning the report.
    const sections = await signSections(criteriaSections(tableCriteria));
    // Each staff member only ever sees their own scoring — other evaluators'
    // scores are deliberately not loaded here. The stored signature is left out.
    const evaluation = assignment.evaluation
      ? {
          status: assignment.evaluation.status,
          comment: assignment.evaluation.comment,
          signatureStatus: assignment.evaluation.signatureStatus,
          signedAt: assignment.evaluation.signedAt,
          signatureId: assignment.evaluation.signatureId,
          scores: (assignment.evaluation.scores || []).map((s) => ({ criterionId: s.criterionId, score: s.score, note: s.note })),
        }
      : null;

    return {
      assigned: true,
      report: {
        id: report.id,
        reportNumber: report.reportNumber,
        title: report.title,
        implementerName: report.implementerName,
        implementerRegister: report.implementerRegister,
        approvedDate: report.approvedDate,
        submittedAt: report.submittedAt,
        year: report.year,
        description: report.description,
        reportCategory: report.reportCategory,
        status: report.status,
        hasGreenery: report.hasGreenery,
        treeCount: report.treeCount,
        spentAmount: report.spentAmount,
        reportType: { name: report.reportType.name, slug: report.reportType.slug },
        senderCompany: report.senderCompany ? { name: report.senderCompany.name } : null,
        location: report.location
          ? { latitude: report.location.latitude, longitude: report.location.longitude, addressDetail: report.location.addressDetail }
          : null,
      },
      deadline: assignment.deadline,
      evaluation,
      criteria: tableCriteria,
      attachments,
      sections,
      // A report that went back to the sender (or awaits the manager's decision
      // on a return) can't be scored until it comes back.
      scorable: canTransition(report.status, 'evaluate'),
    };
  },
});
