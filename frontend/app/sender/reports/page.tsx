import PageHeader from '@/components/layout/PageHeader';
import ReportTable from '@/components/reports/ReportTable';
import { loadView } from '@/lib/api/server';

export default async function SenderReportsPage() {
  // Rows come newest first, status and score as the sender may see them.
  const { reports: tableReports } = await loadView('sender/reports');

  return (

    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Миний төлөвлөгөө, тайлан" />

      <ReportTable
        emptyHint="Илгээсэн тайлан, төлөвлөгөө энд харагдана. Зүүн цэсний «Жилийн төлөвлөгөө» эсвэл «Биелэлтийн тайлан»-аас илгээнэ үү."
        role="sender"
        reports={tableReports}
      />
    </main>
  );
}
