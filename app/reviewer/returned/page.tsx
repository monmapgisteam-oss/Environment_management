import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/layout/PageHeader';
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
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Буцаасан тайлан" subtitle="Илгээгч байгууллага руу засварлуулахаар буцаасан тайлангууд." />

      {tableReports.length === 0 ? (
        <EmptyState title="Буцаасан тайлан байхгүй байна." />
      ) : (
        <ReportTable role="reviewer" reports={tableReports} showStatusFilter={false} />
      )}
    </main>
  );
}
