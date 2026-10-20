import dataStore from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdditionalReportType } from '@/lib/nav';
import ReportTable from '@/components/reports/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

async function fetchReportTypes() {
  return dataStore.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

// Only the reports the manager distributed to THIS staff member, optionally
// narrowed to a single report type (sidebar sub-item).
async function fetchAssignedReports(evaluatorUserId: string, typeSlug?: string) {
  const assignments = await dataStore.reportAssignment.findMany({
    where: {
      evaluatorUserId,
      report: {
        title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
        ...(typeSlug ? { reportType: { slug: typeSlug } } : {}),
      },
    },
    include: {
      report: {
        include: {
          reportType: true,
          senderCompany: true,
          location: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  const reports = await attachEffectiveSenderCompanies(assignments.map((assignment) => assignment.report));
  const reportById = new Map(reports.map((report) => [report.id, report]));

  const seenReportIds = new Set<string>();
  return assignments.filter((assignment) => {
    if (seenReportIds.has(assignment.report.id)) return false;
    seenReportIds.add(assignment.report.id);
    return true;
  }).map((assignment) => {
    const report = reportById.get(assignment.report.id) || assignment.report;
    // Surface the report's own state for return flows so the staff member sees
    // "Буцаах хүсэлт илгээгдсэн" after they ask the manager to return it (and
    // "Засвар шаардсан" if the manager actually returned it to the sender).
    // Otherwise derive the status from whether they have submitted their score.
    const reportStatus = report.status;
    const status =
      reportStatus === 'return_requested' || reportStatus === 'needs_revision'
        ? reportStatus
        : assignment.status === 'submitted'
          ? 'completed'
          : 'in_review';
    return {
      id: report.id,
      reportNumber: report.reportNumber,
      reportType: report.reportType,
      title: report.title,
      submittedAt: report.submittedAt?.toISOString() || null,
      status,
      finalScore: report.finalScore,
      senderCompany: report.senderCompany,
      location: report.location,
    };
  });
}

export default async function EvaluatorDashboard(props: { searchParams: Promise<{ type?: string }> }) {
  const searchParams = await props.searchParams;
  // A staff member must be logged in to see their assigned reports.
  const user = await requireUser('evaluator');

  const [reportTypes, reports] = await Promise.all([
    fetchReportTypes(),
    fetchAssignedReports(user.id, searchParams.type),
  ]);

  // "Нэмэлт мэдээлэл" is shown as its own top-level menu item (below
  // "Үнэлгээ өгсөн тайлангууд"), so it is excluded from the report-type submenu.
  const additionalType = reportTypes.find(isAdditionalReportType);
  const isAdditional = !!additionalType && searchParams.type === additionalType.slug;

  const activeTypeName = searchParams.type
    ? reportTypes.find((rt) => rt.slug === searchParams.type)?.name
    : null;

  return (
    <main className="flex-1 min-w-0 space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          {isAdditional ? 'Нэмэлт мэдээлэл' : 'Надад оноогдсон тайлангууд'}
        </h2>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-soft border border-slate-200">
          <p className="text-sm text-slate-400">
            {activeTypeName
              ? `${activeTypeName} төрлийн оноогдсон тайлан алга байна.`
              : 'Танд оноогдсон тайлан одоогоор алга байна.'}
          </p>
        </div>
      ) : (
        <ReportTable reports={reports} role="staff" showStatusFilter={false} />
      )}
    </main>
  );
}
