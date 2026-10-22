import PageHeader from '@/components/layout/PageHeader';
import { redirect } from 'next/navigation';
import CompanyMapSection from '@/components/map/CompanyMapSection';
import { requireUser } from '@/lib/auth';
import { fetchSenderCompanyPoints } from '@/lib/map/senderLocations';

export default async function SenderGeographyPage() {
  const user = await requireUser('sender');
  if (!user.companyId) redirect('/login/sender');

  const points = await fetchSenderCompanyPoints(user.companyId);

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Газарзүйн мэдээлэл" subtitle="Миний илгээсэн тайлангуудын байршил." />

      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
        style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}
      >
        <CompanyMapSection points={points} detailRole="sender" />
      </div>
    </main>
  );
}
