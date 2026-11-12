import PageHeader from '@/components/layout/PageHeader';
import { loadView } from '@/lib/api/server';
import ReportTypesManager from '@/components/admin/ReportTypesManager';

export default async function AdminSettingsPage() {
  const { reportTypes } = await loadView('admin/settings');

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Тайлангийн төрөл" subtitle="Жилийн төлөвлөгөө, Биелэлтийн тайлан нь үндсэн төрөл тул өөрчлөгдөхгүй." />

      <ReportTypesManager reportTypes={reportTypes} />
    </main>
  );
}
