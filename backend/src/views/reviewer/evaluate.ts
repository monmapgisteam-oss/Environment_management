import dataStore from '@/lib/db';
import { canAccessReport } from '@/lib/auth';
import { signAttachments } from '@/lib/db/storage';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { fetchCriteriaForReport } from '@/lib/reports/criteria';
import { parseAttachments } from '@shared/reports/attachments';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { managerEvaluationState, managerScoringError } from '@shared/reports/managerEvaluation';
import { scoresReleased } from '@shared/reports/scoreRelease';
import { defineView } from '../define';

async function fetchReport(id: string) {
  const report = await dataStore.report.findUnique({
    where: { id, title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: {
        include: {
          evaluator: { select: { id: true, name: true, role: true } },
          evaluation: { include: { scores: true } },
        },
      },
    },
  });
  return report ? (await attachEffectiveSenderCompanies([report]))[0] : null;
}

// The manager's own scoring sheet for one report, beside the members' signed
// scores. The raw signature never leaves the backend.
export default defineView({
  name: 'reviewer/evaluate/:id',
  roles: ['review_manager'],
  async load({ user, params }) {
    const report = await fetchReport(params.id);
    if (!report || !(await canAccessReport(user, report))) return { state: 'missing' };

    const progress = managerEvaluationState(report.assignments, user.id);
    const ownEvaluation = progress.ownAssignment?.evaluation;
    const scoringError = managerScoringError(report.status, report.assignments, user.id, scoresReleased(report));
    if (scoringError && !progress.ownSigned) {
      return { state: 'blocked', report: { id: report.id, reportNumber: report.reportNumber }, scoringError };
    }
    const criteria = await fetchCriteriaForReport(report);
    const attachments = await signAttachments(parseAttachments(report.fileUrl));

    return {
      state: 'ready',
      report: {
        id: report.id,
        reportNumber: report.reportNumber,
        title: report.title,
        reportCategory: report.reportCategory,
        reportType: { name: report.reportType.name, slug: report.reportType.slug },
        senderCompany: { name: report.senderCompany.name },
        location: report.location ? { latitude: report.location.latitude, longitude: report.location.longitude } : null,
        hasGreenery: report.hasGreenery,
        treeCount: report.treeCount,
        spentAmount: report.spentAmount,
      },
      scoringError,
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        maxScore: c.maxScore,
        sortOrder: c.sortOrder,
        sheet: c.sheet,
      })),
      attachments,
      ownEvaluation: ownEvaluation
        ? {
            comment: ownEvaluation.comment,
            status: ownEvaluation.status,
            signatureStatus: ownEvaluation.signatureStatus,
            signedAt: ownEvaluation.signedAt,
            signatureId: ownEvaluation.signatureId,
            scores: ownEvaluation.scores.map((s) => ({ criterionId: s.criterionId, score: s.score, note: s.note })),
          }
        : null,
      otherEvaluations: progress.signedMembers.flatMap(({ evaluator, evaluation }) => evaluation ? [{
        evaluatorName: evaluator.name,
        totalScore: evaluation.totalScore,
        scores: evaluation.scores.map((s) => ({ criterionId: s.criterionId, score: s.score })),
      }] : []),
    };
  },
});
