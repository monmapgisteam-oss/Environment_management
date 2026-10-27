import dataStore from '@/lib/db';
import { fetchCriteriaFor, fetchCriteriaForReport } from '@/lib/reports/criteria';
import AttachmentList from '@/components/reports/AttachmentList';
import MaterialAttachmentList from '@/components/reports/MaterialAttachmentList';
import ManagerReturnPanel from '@/components/reports/ManagerReturnPanel';
import ReportCoverLink from '@/components/reports/detail/ReportCoverLink';
import SignedScanCard from '@/components/reports/detail/SignedScanCard';
import AssignedStaffCard from '@/components/reports/detail/AssignedStaffCard';
import ReportInfoSection from '@/components/reports/detail/ReportInfoSection';
import ReportLocationCard from '@/components/reports/detail/ReportLocationCard';
import RevisionNotice from '@/components/reports/detail/RevisionNotice';
import EvaluationSection from '@/components/reports/detail/EvaluationSection';
import ReportActions from '@/components/reports/detail/ReportActions';
import StatusTimeline from '@/components/reports/detail/StatusTimeline';
import ScoreApprovalCard from '@/components/reports/detail/ScoreApprovalCard';
import CompanyApprovalButtons from '@/components/admin/CompanyApprovalButtons';
import ConclusionComments, { type ConclusionComment } from '@/components/reports/detail/ConclusionComments';
import type { AssignedStaffMember, EvaluationSummary, ScoreApproval, ViewerRole } from '@/components/reports/detail/types';
import { parseAttachments } from '@/lib/reports/attachments';
import { signAttachments, createSignedUrl } from '@/lib/db/storage';
import { canAccessReport, requireUser } from '@/lib/auth';
import { createQrImageUrl, getPublicProfileQrUrl } from '@/lib/auth/profileQr';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';
import { scoresReleased } from '@/lib/reports/scoreRelease';
import { scoringAttachmentsFor } from '@/lib/reports/scoringAttachments';
import { parseRevisionItems, reportSections } from '@/lib/reports/revisions';
import { signSections } from '@/lib/reports/reportSections';

type Props = {
  params: Promise<{ id: string }>;
};

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

export default async function ReportDetailPage(props: Props) {
  const params = await props.params;
  const currentUser = await requireUser();
  const isStaff = currentUser.role === 'evaluator';
  const isReviewer = currentUser.role === 'review_manager';

  const report = await fetchReportDetail(params.id);

  if (!report || !(await canAccessReport(currentUser, report))) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }
  const criteria = await fetchCriteriaForReport(report);

  const uniqueAssignments = uniqueAssignmentsByEvaluator(report.assignments);

  // A staff member viewing the report may only see their OWN evaluation, never
  // their colleagues'. Managers and the sender see every evaluator's scores.
  const visibleAssignments = uniqueAssignments.flatMap(({ evaluator, evaluation }) =>
    !evaluation || (isStaff && evaluator?.id !== currentUser.id) ? [] : [{ evaluator, evaluation }],
  );
  const evaluations: EvaluationSummary[] = await Promise.all(
    visibleAssignments.map(async ({ evaluator, evaluation }) => ({
      evaluatorName: evaluator.name,
      evaluatorPosition: evaluator.position,
      // The manager prints the scores with each signer's QR code, which opens
      // their public profile (name, position, workplace, contact).
      evaluatorQrUrl: isReviewer ? await createQrImageUrl(await getPublicProfileQrUrl(evaluator.id), 160) : null,
      totalScore: evaluation.totalScore,
      comment: evaluation.comment,
      scores: evaluation.scores,
      // Safe verification metadata only — never the raw numeric signature/PIN.
      signatureStatus: evaluation.signatureStatus,
      signedAt: evaluation.signedAt ? evaluation.signedAt.toISOString() : null,
      signatureId: evaluation.signatureId,
      documentHash: evaluation.documentHash,
    })),
  );

  // Staff this report was distributed to, with whether each has scored it yet.
  const assignedStaff: AssignedStaffMember[] = uniqueAssignments.map(({ evaluator, evaluation }) => ({
    name: evaluator.name,
    position: evaluator.position,
    submitted: !!evaluation,
  }));

  const isSenderView = !isReviewer && !isStaff;
  const viewerRole: ViewerRole = isReviewer ? 'manager' : isStaff ? 'staff' : 'sender';
  const isConclusion = report.title === GENERAL_EVALUATION_CONCLUSION_TITLE;
  const needsRevision = isSenderView && !isConclusion && report.status === 'needs_revision';

  const attachments = await signAttachments(parseAttachments(report.fileUrl));
  const revisionItems = parseRevisionItems(report.revisionItems);
  // The manager picks from these sections when returning the report.
  const sections =
    isReviewer && !isConclusion
      ? await signSections(
          reportSections({
            reportType: report.reportType.name,
            reportCategory: report.reportCategory,
            // Evidence rows of the submit form follow the performance sheet.
            criteria: await fetchCriteriaFor(report.reportCategory, 'performance'),
            attachments: parseAttachments(report.fileUrl),
          }),
        )
      : [];
  const { criterionAttachments, reportAttachments } = scoringAttachmentsFor(attachments, criteria);
  const signedScanDownloadUrl = report.signedScanUrl ? await createSignedUrl(report.signedScanUrl) : null;

  // Manager only sees the print/scan panel once every assigned staff member
  // has actually submitted a score — nothing to sign before that.
  const allEvaluatorsDone = assignedStaff.length > 0 && assignedStaff.every((member) => member.submitted);

  // Scores stay hidden from the sender until the manager signs them off with
  // their digital signature — a single staff member finishing (or even all of
  // them) must not leak scores early. Managers and staff always see what
  // they're allowed to.
  const scoresVisible = !isSenderView || scoresReleased(report);

  const approver = report.scoresApprovedById
    ? await dataStore.user.findUnique({ where: { id: report.scoresApprovedById } })
    : null;
  const approval: ScoreApproval | null =
    report.scoresApprovedAt && approver
      ? {
          name: approver.name,
          position: approver.position,
          qrUrl: isReviewer ? await createQrImageUrl(await getPublicProfileQrUrl(approver.id), 160) : null,
          signatureId: report.scoresApprovalSignatureId,
          approvedAt: report.scoresApprovedAt.toISOString(),
        }
      : null;

  // A conclusion carries the admin's and managers' comments; a company that
  // just signed up is still waiting for the admin.
  const isAdmin = currentUser.role === 'admin';
  const conclusionComments: ConclusionComment[] = isConclusion
    ? (await dataStore.reportComment.findMany({ where: { reportId: report.id }, orderBy: { createdAt: 'asc' } })).map((comment) => ({
        id: comment.id,
        authorName: comment.authorName,
        authorRole: comment.authorRole,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
      }))
    : [];
  const companyPending = isConclusion && report.senderCompany?.approvalStatus === 'pending';
  const companyRejected = isConclusion && report.senderCompany?.approvalStatus === 'rejected';

  const scoredCount = assignedStaff.filter((member) => member.submitted).length;

  return (
    <main className="flex-1 min-w-0 px-6 py-7 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Left: everything about the report itself */}
        <div className="min-w-0 space-y-5">
          {/* Sender sees first why the report was returned and what to fix. */}
          {needsRevision && (report.returnReason || revisionItems.length > 0) && (
            <RevisionNotice
              reason={report.returnReason}
              items={revisionItems}
              fixHref={revisionItems.length > 0 ? `/sender/revise/${report.id}` : `/sender/submit?edit=${report.id}`}
            />
          )}
          {(companyPending || companyRejected) && (isReviewer || isAdmin) && (
            <div
              className={`flex flex-wrap items-center justify-between gap-3 border px-5 py-3.5 text-sm ${
                companyRejected ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <p className="min-w-0">
                {companyRejected ? (
                  <>
                    <span className="font-semibold">Татгалзсан бүртгэл.</span> {report.senderCompany.name} байгууллагын бүртгэлийг
                    татгалзсан.
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Шинэ бүртгэл.</span> {report.senderCompany.name} байгууллагыг админ баталгаажуулаагүй
                    байна. Дүгнэлтийг шалгаад {isAdmin ? 'баталгаажуулна уу.' : 'доор тайлбар үлдээнэ үү.'}
                  </>
                )}
              </p>
              {isAdmin && <CompanyApprovalButtons company={report.senderCompany} rejected={companyRejected} />}
            </div>
          )}
          <ReportInfoSection report={report} isConclusion={isConclusion} isSenderView={isSenderView} />


          {reportAttachments.length > 0 && (
            <AttachmentList
              attachments={reportAttachments}
              title="Хавсаргасан файл"
              emptyText="Хавсаргасан файл байхгүй байна."
            />
          )}
          <MaterialAttachmentList attachments={attachments} reportType={report.reportType.name} reportCategory={report.reportCategory} />

          {!isConclusion && (
            <EvaluationSection
              report={report}
              criteria={criteria}
              criterionAttachments={criterionAttachments}
              evaluations={evaluations}
              viewerRole={viewerRole}
              isReviewer={isReviewer}
              allEvaluatorsDone={allEvaluatorsDone}
              scoresVisible={scoresVisible}
              approval={approval}
            />
          )}

          {isConclusion && (
            <ConclusionComments reportId={report.id} initialComments={conclusionComments} canComment={isReviewer || isAdmin} />
          )}

          {!isConclusion && <ReportLocationCard report={report} />}
        </div>

        {/* Right: progress and actions, kept in view while scrolling */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          {!isConclusion && (
            <StatusTimeline
              status={report.status}
              submittedAt={report.submittedAt}
              assignedCount={assignedStaff.length}
              scoredCount={scoredCount}
              releasedAt={report.scoresApprovedAt ?? report.signedScanUploadedAt ?? null}
              released={scoresReleased(report)}
            />
          )}

          {!isConclusion && <ScoreApprovalCard approval={approval} />}

          {/* Sender downloads the manager's scanned, physically-signed copy. */}
          {isSenderView && signedScanDownloadUrl && (
            <SignedScanCard url={signedScanDownloadUrl} name={report.signedScanName} />
          )}

          {/* Manager sees which staff this report was distributed to. */}
          {isReviewer && !isConclusion && (
            <AssignedStaffCard
              staff={assignedStaff}
              assignReport={
                report.status === 'completed' || report.status === 'approved'
                  ? undefined
                  : { id: report.id, reportNumber: report.reportNumber, title: report.title }
              }
            />
          )}

          {/* Manager controls: confirm/dismiss a staff return request, or return
              the report to the sender directly. */}
          {isReviewer && !isConclusion && (
            <ManagerReturnPanel
              reportId={report.id}
              status={report.status}
              returnReason={report.returnReason}
              returnRequestedBy={report.returnRequestedBy}
              revisionItems={revisionItems}
              sections={sections}
            />
          )}

          <div className="space-y-2">
            {(isReviewer || isStaff) && !isConclusion && <ReportCoverLink reportId={report.id} isStaff={isStaff} />}
            <ReportActions
              reportId={report.id}
              isConclusion={isConclusion}
              isReviewer={isReviewer}
              isStaff={isStaff}
              isAdmin={isAdmin}
              // The revision notice at the top carries the fix button when shown.
              canFix={needsRevision && !report.returnReason && revisionItems.length === 0}
              revisePath={revisionItems.length > 0 ? `/sender/revise/${report.id}` : undefined}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
