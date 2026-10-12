import dataStore from '@/lib/arcgis/data';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';
import { adminNavItems } from '@/lib/adminNav';
import { attachEffectiveSenderCompanies } from '@/lib/reportCompanies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/conclusions';

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
    <div className="flex min-h-screen bg-background">
      <Sidebar items={adminNavItems('dashboard')} role="admin" />

        <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Систем админ" companyName="Системийн удирдлага" role="admin" />
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
      </div>
    </div>
  );
}
