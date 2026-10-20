import { redirect } from 'next/navigation';
import dataStore from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import ReportTable from '@/components/reports/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

function dateValue(value?: Date | string | null) {
  if (!value) return 0;
  return value instanceof Date ? value.getTime() : new Date(value).getTime() || 0;
}

function evaluatedAssignmentRank(assignment: any) {
  const signed = assignment.evaluation?.status === 'SIGNED' ? 4 : 0;
  const verified = assignment.evaluation?.signatureStatus === 'VERIFIED' ? 2 : 0;
  return signed + verified + 1;
}

function evaluatedActivityTime(assignment: any) {
  return Math.max(
    dateValue(assignment.evaluation?.signedAt),
    dateValue(assignment.evaluation?.submittedAt),
    dateValue(assignment.submittedAt),
    dateValue(assignment.assignedAt),
  );
}

function evaluatedSignedTime(assignment: any) {
  return Math.max(
    dateValue(assignment.evaluation?.signedAt),
    dateValue(assignment.evaluation?.submittedAt),
    dateValue(assignment.submittedAt),
  );
}

function isBetterEvaluatedAssignment(candidate: any, existing: any) {
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

function uniqueEvaluatedAssignmentsByReport(assignments: any[]) {
  const byReport = new Map<string, any>();
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

  const reports = await attachEffectiveSenderCompanies(uniqueAssignments.map((assignment: any) => assignment.report));
  const reportById = new Map(reports.map((report: any) => [report.id, report]));

  return uniqueAssignments.map((assignment: any) => {
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
  const user = await getCurrentUser();
  if (!user || user.role !== 'evaluator') {
    redirect('/login/reviewer');
  }

  const reports = await fetchEvaluatedReports(user.id);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
          items={[
            { label: 'Надад оноогдсон тайлангууд', href: '/evaluator' },
            { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated', active: true },
            { label: 'Газарзүйн мэдээлэл', href: '/evaluator/geography' },
            { label: 'Тайлан хайх', href: '/evaluator/survey' },
            { label: 'Нэмэлт мэдээлэл', href: '/evaluator?type=type-5' },
          ]}
        />

        <div className="flex min-w-0 flex-1 flex-col">
        <Header userName={user.name} companyName="Хянах байгууллага" role="staff" />
        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Үнэлгээ өгсөн тайлангууд</h2>
            <p className="text-sm text-slate-600">Таны үнэлгээ өгсөн бүх тайлан.</p>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-soft border border-slate-200">
              <p className="text-sm text-slate-400">Та одоогоор ямар ч тайланд үнэлгээ өгөөгүй байна.</p>
            </div>
          ) : (
            <ReportTable reports={reports} role="staff" showStatusFilter={false} />
          )}
        </main>
      </div>
    </div>
  );
}
