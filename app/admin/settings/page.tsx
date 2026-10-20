import dataStore from '@/lib/db';
import ReportTypesManager from '@/components/admin/ReportTypesManager';

async function fetchReportTypes() {
  return dataStore.reportType.findMany({
    include: { _count: { select: { reports: true } } },
    orderBy: { name: 'asc' },
  });
}

export default async function AdminSettingsPage() {
  const reportTypes = await fetchReportTypes();

  return (
    <main className="flex-1 min-w-0 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Тохиргоо</h1>
        <p className="mt-1.5 text-sm text-slate-500">Тайлангийн төрөл нэмэх, засах, идэвхгүй болгох</p>
      </div>

      <ReportTypesManager reportTypes={reportTypes} />
    </main>
  );
}
