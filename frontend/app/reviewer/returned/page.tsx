import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/layout/PageHeader';
import ReportTable from '@/components/reports/ReportTable';
import { loadView } from '@/lib/api/server';
import { PLAN_NOUN } from '@shared/reports/terms';

export default async function ReturnedReportsPage() {
  const { reports } = await loadView('reviewer/returned');

  const toRow = (report: (typeof reports)[number]) => ({
    id: report.id,
    reportNumber: report.reportNumber,
    reportType: report.reportType,
    title: report.title,
    submittedAt: report.submittedAt?.toISOString() || null,
    status: report.status,
    finalScore: report.finalScore,
    senderCompany: report.senderCompany,
    location: report.location,
  });
  // Evaluators' return requests wait for the manager's decision; returned
  // reports wait for the sender.
  const requested = reports.filter((report) => report.status === 'return_requested').map(toRow);
  const tableReports = reports.filter((report) => report.status === 'needs_revision').map(toRow);

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Буцаасан БОМТ" subtitle="Гишүүдийн буцаах хүсэлт, илгээгч байгууллага руу засварлуулахаар буцаасан БОМТ, тайлангууд." />

      {requested.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">Буцаах хүсэлт ({requested.length})</h2>
          <p className="text-sm text-slate-500">Гишүүн дутуу гэж үзсэн тайлан. Нээж, илгээгчид буцаах эсвэл хүсэлтийг татгалзана уу.</p>
          <ReportTable role="reviewer" reports={requested} showStatusFilter={false} noun={PLAN_NOUN} />
        </section>
      )}

      <h2 className="text-base font-semibold text-slate-900">Илгээгчид буцаасан</h2>

      {tableReports.length === 0 ? (
        <EmptyState title="Буцаасан БОМТ байхгүй байна." />
      ) : (
        <ReportTable role="reviewer" reports={tableReports} showStatusFilter={false} noun={PLAN_NOUN} />
      )}
    </main>
  );
}
