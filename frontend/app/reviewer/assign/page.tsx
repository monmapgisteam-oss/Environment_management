import PageHeader from '@/components/layout/PageHeader';
import AssignBoard from '@/components/evaluation/AssignBoard';
import { loadView } from '@/lib/api/server';

export default async function AssignPage() {
  const { staff, reports } = await loadView('reviewer/assign');

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Гишүүдэд оноох" subtitle="Ирсэн тайлангуудыг үнэлгээний гишүүдэд хуваарилна." />

      <AssignBoard reports={reports} staff={staff} />
    </main>
  );
}
