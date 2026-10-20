import dataStore from '@/lib/db';
import ReportTable from '@/components/reports/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

async function fetchReturnedReports() {
  const reports = await dataStore.report.findMany({
    where: { status: 'needs_revision', title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
  return attachEffectiveSenderCompanies(reports);
}

export default async function ReturnedReportsPage() {
  const reports = await fetchReturnedReports();

  const tableReports = reports.map((report) => ({
    id: report.id,
    reportNumber: report.reportNumber,
    reportType: report.reportType,
    title: report.title,
    submittedAt: report.submittedAt?.toISOString() || null,
    status: report.status,
    finalScore: report.finalScore,
    senderCompany: report.senderCompany,
    location: report.location,
  }));

  return (
    <main className="flex-1 min-w-0 space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Буцаасан тайлан</h1>
        <p className="text-sm text-slate-600">Илгээгч байгууллага руу засварлуулахаар буцаасан тайлангууд.</p>
      </div>

      {tableReports.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-soft">
          <p className="text-sm font-medium text-slate-500">Буцаасан тайлан байхгүй байна.</p>
        </div>
      ) : (
        <ReportTable role="reviewer" reports={tableReports} showStatusFilter={false} />
      )}
    </main>
  );
}
