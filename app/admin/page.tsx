import dataStore from '@/lib/db';
import ReportTable from '@/components/reports/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

async function fetchAdminReports() {
  const reports = await dataStore.report.findMany({
    where: { title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return attachEffectiveSenderCompanies(reports);
}

export default async function AdminDashboard() {
  const reports = await fetchAdminReports();

  return (
    <main className="flex-1 min-w-0 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Удирдлагын хуудас</h1>
        <p className="mt-1.5 text-sm text-slate-500">Тайлан, үнэлгээний ерөнхий нэгтгэл</p>
      </div>

      <ReportTable reports={reports.map((report: any) => ({
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
    </main>
  );
}
