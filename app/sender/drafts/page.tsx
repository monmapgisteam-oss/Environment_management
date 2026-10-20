import dataStore from '@/lib/db';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import ReportTable from '@/components/reports/ReportTable';
import { senderSidebarItems } from '@/lib/senderNav';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

async function fetchDraftReports() {
  return dataStore.report.findMany({
    where: { status: 'draft', title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export default async function DraftsPage() {
  const reports = await fetchDraftReports();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={senderSidebarItems('drafts')} />

        <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Илгээх хэрэглэгч" companyName="Илгээх байгууллага" companyType="sender" />
        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Ноорог</h2>
            <p className="text-sm text-slate-500 mt-1">Хадгалсан ноорог тайлангуудын жагсаалт.</p>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-soft">
              <p className="text-sm text-slate-400">Одоогоор хадгалсан ноорог байхгүй байна.</p>
            </div>
          ) : (
            <ReportTable
              role="sender"
              reports={reports.map((report: any) => ({
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
      </div>
    </div>
  );
}
