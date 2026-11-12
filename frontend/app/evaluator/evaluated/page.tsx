import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/layout/PageHeader';
import { loadView } from '@/lib/api/server';
import { requireUser } from '@/lib/auth';
import ReportTable from '@/components/reports/ReportTable';

export default async function EvaluatedReportsPage() {
  await requireUser('evaluator');

  // Reports this staff member has already scored, with the score they gave.
  const { reports } = await loadView('evaluator/evaluated');

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Үнэлгээ өгсөн тайлангууд" subtitle="Таны үнэлгээ өгсөн бүх тайлан." />

      {reports.length === 0 ? (
        <EmptyState title="Та одоогоор ямар ч тайланд үнэлгээ өгөөгүй байна." hint="Танд оноогдсон тайлангууд «Надад оноогдсон тайлангууд» хэсэгт харагдана." action={{ label: "Оноогдсон тайлангууд", href: "/evaluator" }} />
      ) : (
        <ReportTable reports={reports} role="staff" showStatusFilter={false} />
      )}
    </main>
  );
}
