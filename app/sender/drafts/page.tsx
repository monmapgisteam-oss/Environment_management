import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import ReportTable from '@/components/reports/ReportTable';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { requireUser } from '@/lib/auth';

// Drafts are private to the company that is writing them.
async function fetchDraftReports(companyId: string) {
  return dataStore.report.findMany({
    where: { status: 'draft', senderCompanyId: companyId, title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export default async function DraftsPage() {
  const user = await requireUser('sender');
  const reports = user.companyId ? await fetchDraftReports(user.companyId) : [];

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Ноорог" subtitle="Хадгалсан ноорог тайлангуудын жагсаалт." />

      {reports.length === 0 ? (
        <EmptyState title="Ноорог хадгалаагүй байна." hint="Тайлан бичиж эхлээд «Ноорог хадгалах» товчийг дарвал энд хадгалагдана." action={{ label: "Тайлан илгээх", href: "/sender/submit?type=plan" }} />
      ) : (
        <ReportTable
          emptyHint="Илгээх маягт дээр «Ноорог хадгалах» дарсан тайлан энд хадгалагдана."
          role="sender"
          reports={reports.map((report) => ({
            id: report.id,
            reportNumber: report.reportNumber,
            reportType: report.reportType,
            title: report.title,
            submittedAt: report.submittedAt?.toISOString() || null,
            status: report.status,
            finalScore: report.finalScore,
            senderCompany: report.senderCompany,
            location: report.location,
          }))}
        />
      )}
    </main>
  );
}
