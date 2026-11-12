import PageHeader from '@/components/layout/PageHeader';
import { redirect } from 'next/navigation';
import CompanyMapSection from '@/components/map/CompanyMapSection';
import { loadView } from '@/lib/api/server';
import { requireUser } from '@/lib/auth';

export default async function SenderGeographyPage() {
  const user = await requireUser('sender');
  if (!user.companyId) redirect('/login/sender');

  const { points } = await loadView('sender/geography');

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Газарзүйн мэдээлэл" subtitle="Миний илгээсэн тайлангуудын байршил." />

      <div
        className="overflow-hidden border border-slate-200 bg-white shadow-soft"
        style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}
      >
        <CompanyMapSection points={points} detailRole="sender" />
      </div>
    </main>
  );
}
