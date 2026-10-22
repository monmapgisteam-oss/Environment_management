import PageHeader from '@/components/layout/PageHeader';
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
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Тохиргоо" subtitle="Тайлангийн төрөл нэмэх, засах, идэвхгүй болгох" />

      <ReportTypesManager reportTypes={reportTypes} />
    </main>
  );
}
