import dataStore from '@/lib/db';
import { fetchCriteriaFor } from '@/lib/reports/criteria';
import AttachmentList from '@/components/reports/AttachmentList';
import MaterialAttachmentList from '@/components/reports/MaterialAttachmentList';
import ManagerReturnPanel from '@/components/reports/ManagerReturnPanel';
import SurveyReportDetail from '@/components/reports/detail/SurveyReportDetail';
import ReportCoverLink from '@/components/reports/detail/ReportCoverLink';
import SignedScanCard from '@/components/reports/detail/SignedScanCard';
import AssignedStaffCard from '@/components/reports/detail/AssignedStaffCard';
import ReportInfoSection from '@/components/reports/detail/ReportInfoSection';
import RevisionNotice from '@/components/reports/detail/RevisionNotice';
import EvaluationSection from '@/components/reports/detail/EvaluationSection';
import ReportActions from '@/components/reports/detail/ReportActions';
import StatusTimeline from '@/components/reports/detail/StatusTimeline';
import type { AssignedStaffMember, EvaluationSummary, ViewerRole } from '@/components/reports/detail/types';
import { parseAttachments } from '@/lib/reports/attachments';
import { signAttachments, createSignedUrl } from '@/lib/db/storage';
import { canAccessReport, requireUser, type CurrentUser } from '@/lib/auth';
import { fetchSurveyReportByObjectId, type SurveyReport } from '@/lib/survey/reports';
import { attachEffectiveSenderCompanies, normalizeRegister } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';
import { splitScoringAttachments } from '@/lib/reports/scoringAttachments';

type Props = {
  params: Promise<{ id: string }>;
};

function parseSurveyReportId(id: string) {
  const match = /^survey-(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
}

// Senders only see survey records filed under their own register number.
function canViewSurveyReport(user: CurrentUser, survey: SurveyReport) {
  return (
    user.role !== 'sender' ||
    (!!survey.register && normalizeRegister(survey.register) === normalizeRegister(user.company?.registerNumber))
  );
}

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
  const surveyObjectId = parseSurveyReportId(params.id);
  if (surveyObjectId !== null) {
    const survey = await fetchSurveyReportByObjectId(surveyObjectId);
    if (!survey || !canViewSurveyReport(currentUser, survey)) {
      return <div className="p-8 text-center text-slate-500">Survey123 тайлан олдсонгүй.</div>;
    }
    return <SurveyReportDetail survey={survey} />;
  }
  const isStaff = currentUser.role === 'evaluator';
  const isReviewer = currentUser.role === 'review_manager';

  const report = await fetchReportDetail(params.id);

  if (!report || !(await canAccessReport(currentUser, report))) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }
  const criteria = await fetchCriteriaFor(report.reportCategory);

  const uniqueAssignments = uniqueAssignmentsByEvaluator(report.assignments);

  // A staff member viewing the report may only see their OWN evaluation, never
  // their colleagues'. Managers and the sender see every evaluator's scores.
  const evaluations: EvaluationSummary[] = uniqueAssignments.flatMap(({ evaluator, evaluation }) => {
    if (!evaluation || (isStaff && evaluator?.id !== currentUser.id)) return [];
    return [{
      evaluatorName: evaluator.name,
      totalScore: evaluation.totalScore,
      comment: evaluation.comment,
      scores: evaluation.scores,
      // Safe verification metadata only — never the raw numeric signature/PIN.
      signatureStatus: evaluation.signatureStatus,
      signedAt: evaluation.signedAt ? evaluation.signedAt.toISOString() : null,
      signatureId: evaluation.signatureId,
      documentHash: evaluation.documentHash,
    }];
  });

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
  const { criterionAttachments, reportAttachments } = splitScoringAttachments(attachments, criteria);
  const signedScanDownloadUrl = report.signedScanUrl ? await createSignedUrl(report.signedScanUrl) : null;

  // Manager only sees the print/scan panel once every assigned staff member
  // has actually submitted a score — nothing to sign before that.
  const allEvaluatorsDone = assignedStaff.length > 0 && assignedStaff.every((member) => member.submitted);

  // Scores stay hidden from the sender until the manager explicitly sends the
  // signed scan — a single staff member finishing (or even all of them) must
  // not leak scores early. Managers and staff always see what they're allowed to.
  const scoresVisible = !isSenderView || !!report.signedScanUrl;

  const scoredCount = assignedStaff.filter((member) => member.submitted).length;

  return (
    <main className="flex-1 min-w-0 px-6 py-7 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Left: everything about the report itself */}
        <div className="min-w-0 space-y-5">
          <ReportInfoSection report={report} isConclusion={isConclusion} isSenderView={isSenderView} />

          {/* Sender sees why the manager returned the report for revision. */}
          {needsRevision && report.returnReason && <RevisionNotice reason={report.returnReason} />}

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
            />
          )}
        </div>

        {/* Right: progress and actions, kept in view while scrolling */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          {!isConclusion && (
            <StatusTimeline
              status={report.status}
              submittedAt={report.submittedAt}
              assignedCount={assignedStaff.length}
              scoredCount={scoredCount}
              signedScanAt={report.signedScanUploadedAt ?? null}
              isSenderView={isSenderView}
            />
          )}

          {/* Sender downloads the manager's scanned, physically-signed copy. */}
          {isSenderView && signedScanDownloadUrl && (
            <SignedScanCard url={signedScanDownloadUrl} name={report.signedScanName} />
          )}

          {/* Manager sees which staff this report was distributed to. */}
          {isReviewer && !isConclusion && <AssignedStaffCard staff={assignedStaff} />}

          {/* Manager controls: confirm/dismiss a staff return request, or return
              the report to the sender directly. */}
          {isReviewer && !isConclusion && (
            <ManagerReturnPanel
              reportId={report.id}
              status={report.status}
              returnReason={report.returnReason}
              returnRequestedBy={report.returnRequestedBy}
            />
          )}

          <div className="space-y-2">
            {(isReviewer || isStaff) && !isConclusion && <ReportCoverLink reportId={report.id} isStaff={isStaff} />}
            <ReportActions
              reportId={report.id}
              isConclusion={isConclusion}
              isReviewer={isReviewer}
              isStaff={isStaff}
              canFix={needsRevision}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
