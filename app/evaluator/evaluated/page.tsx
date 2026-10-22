import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import type { Evaluation, ReportAssignment } from '@/lib/db/models';
import { requireUser } from '@/lib/auth';
import ReportTable from '@/components/reports/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

type EvaluatedAssignment = Pick<ReportAssignment, 'reportId' | 'submittedAt' | 'assignedAt'> & {
  evaluation: Pick<Evaluation, 'status' | 'signatureStatus' | 'signedAt' | 'submittedAt'> | null;
  report?: { id: string };
};

function dateValue(value?: Date | string | null) {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime() || 0;
}

function evaluatedAssignmentRank(assignment: EvaluatedAssignment) {
  const signed = assignment.evaluation?.status === 'SIGNED' ? 4 : 0;
  const verified = assignment.evaluation?.signatureStatus === 'VERIFIED' ? 2 : 0;
  return signed + verified + 1;
}

function evaluatedActivityTime(assignment: EvaluatedAssignment) {
  return Math.max(
    dateValue(assignment.evaluation?.signedAt),
    dateValue(assignment.evaluation?.submittedAt),
    dateValue(assignment.submittedAt),
    dateValue(assignment.assignedAt),
  );
}

function evaluatedSignedTime(assignment: EvaluatedAssignment) {
  return Math.max(
    dateValue(assignment.evaluation?.signedAt),
    dateValue(assignment.evaluation?.submittedAt),
    dateValue(assignment.submittedAt),
  );
}

function isBetterEvaluatedAssignment(candidate: EvaluatedAssignment, existing: EvaluatedAssignment) {
  const candidateRank = evaluatedAssignmentRank(candidate);
  const existingRank = evaluatedAssignmentRank(existing);
  if (candidateRank !== existingRank) return candidateRank > existingRank;

  if (candidate.evaluation?.status === 'SIGNED' && existing.evaluation?.status === 'SIGNED') {
    const candidateTime = evaluatedSignedTime(candidate);
    const existingTime = evaluatedSignedTime(existing);
    if (candidateTime && existingTime && candidateTime !== existingTime) {
      return candidateTime < existingTime;
    }
  }

  return evaluatedActivityTime(candidate) > evaluatedActivityTime(existing);
}

function uniqueEvaluatedAssignmentsByReport<T extends EvaluatedAssignment>(assignments: T[]) {
  const byReport = new Map<string, T>();
  for (const assignment of assignments) {
    const reportId = assignment.reportId || assignment.report?.id;
    if (!reportId) continue;
    const existing = byReport.get(reportId);
    if (!existing || isBetterEvaluatedAssignment(assignment, existing)) {
      byReport.set(reportId, assignment);
    }
  }
  return [...byReport.values()].sort((a, b) => evaluatedActivityTime(b) - evaluatedActivityTime(a));
}

// Reports THIS staff member has already scored (their assignment has an
// evaluation). Not the merely-assigned ones.
async function fetchEvaluatedReports(evaluatorUserId: string) {
  const assignments = await dataStore.reportAssignment.findMany({
    where: {
      evaluatorUserId,
      evaluation: { isNot: null },
      report: { title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    },
    include: {
      evaluation: true,
      report: {
        include: {
          reportType: true,
          senderCompany: true,
          location: true,
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });
  const uniqueAssignments = uniqueEvaluatedAssignmentsByReport(assignments);

  const reports = await attachEffectiveSenderCompanies(uniqueAssignments.map((assignment) => assignment.report));
  const reportById = new Map(reports.map((report) => [report.id, report]));

  return uniqueAssignments.map((assignment) => {
    const report = reportById.get(assignment.report.id) || assignment.report;
    return {
      id: report.id,
      reportNumber: report.reportNumber,
      reportType: report.reportType,
      title: report.title,
      submittedAt: report.submittedAt?.toISOString() || null,
      status: 'completed',
      // Show the score this staff member gave.
      finalScore: assignment.evaluation?.totalScore ?? null,
      senderCompany: report.senderCompany,
      location: report.location,
    };
  });
}

export default async function EvaluatedReportsPage() {
  const user = await requireUser('evaluator');

  const reports = await fetchEvaluatedReports(user.id);

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Үнэлгээ өгсөн тайлангууд" subtitle="Таны үнэлгээ өгсөн бүх тайлан." />

      {reports.length === 0 ? (
        <EmptyState title="Та одоогоор ямар ч тайланд үнэлгээ өгөөгүй байна." hint="Танд оноогдсон тайлангууд «Надад оноогдсон тайлангууд» хэсэгт харагдана." action={{ label: "Оноогдсон тайлангууд", href: "/evaluator" }} />
      ) : (
        <ReportTable reports={reports} role="staff" showStatusFilter={false} />
      )}
    </main>
  );
}
