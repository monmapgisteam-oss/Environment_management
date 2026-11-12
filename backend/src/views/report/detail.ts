import dataStore from '@/lib/db';
import { fetchCriteriaForReport } from '@/lib/reports/criteria';
import { parseAttachments } from '@shared/reports/attachments';
import { signAttachments, createSignedUrl } from '@/lib/db/storage';
import { canAccessReport } from '@/lib/auth';
import { createQrImageUrl, getPublicProfileQrUrl } from '@/lib/auth/profileQr';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { uniqueAssignmentsByEvaluator } from '@shared/reports/assignments';
import { scoresReleased } from '@shared/reports/scoreRelease';
import { scoringAttachmentsFor } from '@shared/reports/scoringAttachments';
import { criteriaSections } from '@shared/reports/revisions';
import { signSections } from '@/lib/reports/reportSections';
import { isVerifiedEvaluation, managerApprovalError, managerEvaluationState } from '@shared/reports/managerEvaluation';
import type { AssignedStaffMember, ConclusionComment, EvaluationSummary, ScoreApproval } from '@shared/views/report';
import { defineView } from '../define';
import { forSender } from '../mask';

async function fetchReportDetail(reportId: string) {
  const report = await dataStore.report.findUnique({
    where: { id: reportId },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: {
        include: {
          evaluator: true,
          evaluation: {
            include: {
              scores: {
                include: { criterion: true },
              },
            },
          },
        },
      },
    },
  });
  return report ? (await attachEffectiveSenderCompanies([report]))[0] : null;
}

export default defineView({
  name: 'report/:id',
  roles: [],
  async load({ user: currentUser, params }) {
    const isStaff = currentUser.role === 'evaluator';
    const isReviewer = currentUser.role === 'review_manager';

    const found = await fetchReportDetail(params.id);
    if (!found || !(await canAccessReport(currentUser, found))) return null;
    // The assignments (every evaluator's user record and scores) never leave
    // the backend; the viewer gets only what is derived from them below.
    const { assignments, ...report } = found;
    const criteria = await fetchCriteriaForReport(report);

    const uniqueAssignments = uniqueAssignmentsByEvaluator(assignments);
    const managerProgress = managerEvaluationState(uniqueAssignments, currentUser.id);
    const managerScored = uniqueAssignments.some(({ evaluator, evaluation }) =>
      evaluator.role === 'review_manager' && isVerifiedEvaluation(evaluation),
    );

    // A staff member viewing the report may only see their OWN evaluation, never
    // their colleagues'. Managers and the sender see every evaluator's scores.
    const visibleAssignments = uniqueAssignments.flatMap(({ evaluator, evaluation }) =>
      !evaluation || (isStaff && evaluator?.id !== currentUser.id) ? [] : [{ evaluator, evaluation }],
    );
    const isSenderView = !isReviewer && !isStaff;

    // Scores stay hidden from the sender until the manager signs them off with
    // their digital signature — a single staff member finishing (or even all of
    // them) must not leak scores early. Managers and staff always see what
    // they're allowed to.
    const scoresVisible = !isSenderView || scoresReleased(report);

    // The manager prints the scores with each signer's QR code, which opens their
    // public profile; the sender gets the same sheet once the scores are approved.
    const showSignerQr = isReviewer || (isSenderView && !!report.scoresApprovedAt);
    // Hidden scores are not sent at all; the page only learns that some exist.
    const evaluations: EvaluationSummary[] = scoresVisible
      ? await Promise.all(
          visibleAssignments.map(async ({ evaluator, evaluation }) => ({
            evaluatorName: evaluator.name,
            evaluatorPosition: evaluator.position,
            // Signer QR code for the printed sheet (see showSignerQr).
            evaluatorQrUrl: showSignerQr ? await createQrImageUrl(await getPublicProfileQrUrl(evaluator.id), 160) : null,
            totalScore: evaluation.totalScore,
            comment: evaluation.comment,
            scores: evaluation.scores.map(({ criterion: _criterion, ...score }) => score),
            // Safe verification metadata only — never the raw numeric signature/PIN.
            signatureStatus: evaluation.signatureStatus,
            signedAt: evaluation.signedAt ? evaluation.signedAt.toISOString() : null,
            signatureId: evaluation.signatureId,
            documentHash: evaluation.documentHash,
          })),
        )
      : [];

    // Staff this report was distributed to, with whether each has scored it yet.
    const assignedStaff: AssignedStaffMember[] = managerProgress.members.map(({ evaluator, evaluation }) => ({
      name: evaluator.name,
      position: evaluator.position,
      submitted: isVerifiedEvaluation(evaluation),
    }));

    const isConclusion = report.title === GENERAL_EVALUATION_CONCLUSION_TITLE;

    const attachments = await signAttachments(parseAttachments(report.fileUrl));
    // The manager picks from the report's criteria when returning it.
    const sections = isReviewer && !isConclusion ? await signSections(criteriaSections(criteria)) : [];
    const { criterionAttachments, reportAttachments } = scoringAttachmentsFor(attachments, criteria);
    // Sender downloads the manager's scanned, physically-signed copy.
    const signedScanDownloadUrl = isSenderView && report.signedScanUrl ? await createSignedUrl(report.signedScanUrl) : null;

    const approver = report.scoresApprovedById
      ? await dataStore.user.findUnique({ where: { id: report.scoresApprovedById } })
      : null;
    const approval: ScoreApproval | null =
      report.scoresApprovedAt && approver
        ? {
            name: approver.name,
            position: approver.position,
            qrUrl: showSignerQr ? await createQrImageUrl(await getPublicProfileQrUrl(approver.id), 160) : null,
            signatureId: report.scoresApprovalSignatureId,
            approvedAt: report.scoresApprovedAt.toISOString(),
          }
        : null;

    // A conclusion carries the admin's and managers' comments.
    const conclusionComments: ConclusionComment[] = isConclusion
      ? (await dataStore.reportComment.findMany({ where: { reportId: report.id }, orderBy: { createdAt: 'asc' } })).map((comment) => ({
          id: comment.id,
          authorName: comment.authorName,
          authorRole: comment.authorRole,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
        }))
      : [];

    return {
      // The sender sees the report as GET /api/reports/:id returns it.
      report: currentUser.role === 'sender' ? forSender(report) : report,
      criteria: scoresVisible ? criteria : [],
      attachments,
      reportAttachments,
      criterionAttachments: scoresVisible ? criterionAttachments : {},
      evaluations,
      evaluationCount: visibleAssignments.length,
      // Names of the assigned staff are for the manager only.
      assignedStaff: isReviewer ? assignedStaff : [],
      assignedCount: assignedStaff.length,
      scoredCount: assignedStaff.filter((member) => member.submitted).length,
      managerScored,
      // Manager only sees the print/scan panel once every assigned staff member
      // has actually submitted a score — nothing to sign before that.
      allEvaluatorsDone: managerProgress.allMembersSigned,
      approval,
      approvalPending:
        isReviewer && ['submitted', 'assigned', 'in_review', 'completed'].includes(report.status) && !scoresReleased(report)
          ? {
              reportId: report.id,
              reportNumber: report.reportNumber,
              evaluatorCount: assignedStaff.length,
              signedEvaluatorCount: managerProgress.signedMembers.length,
              finalScore: report.finalScore,
              ownEvaluationSigned: managerProgress.ownSigned,
              canApprove: managerApprovalError(report, uniqueAssignments, currentUser.id) === null,
            }
          : null,
      sections,
      signedScanDownloadUrl,
      conclusionComments,
    };
  },
});
