import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTypesManager from '@/components/ReportTypesManager';
import { adminNavItems } from '@/lib/adminNav';

async function fetchReportTypes() {
  return prisma.reportType.findMany({
    include: { _count: { select: { reports: true } } },
    orderBy: { name: 'asc' },
  });
}

export default async function AdminSettingsPage() {
  const reportTypes = await fetchReportTypes();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={adminNavItems('settings')} role="admin" />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Систем админ" companyName="Системийн удирдлага" role="admin" />
        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Тохиргоо</h1>
            <p className="mt-1.5 text-sm text-slate-500">Тайлангийн төрөл нэмэх, засах, идэвхгүй болгох</p>
          </div>

          <ReportTypesManager reportTypes={reportTypes} />
        </main>
      </div>
    </div>
  );
}
