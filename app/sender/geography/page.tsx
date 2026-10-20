import { redirect } from 'next/navigation';
import CompanyMapSection from '@/components/map/CompanyMapSection';
import { requireUser } from '@/lib/auth';
import { fetchSenderCompanyPoints } from '@/lib/map/senderLocations';

export default async function SenderGeographyPage() {
  const user = await requireUser('sender');
  if (!user.companyId) redirect('/login/sender');

  const points = await fetchSenderCompanyPoints(user.companyId);

  return (
    <main className="flex-1 min-w-0 space-y-4 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Газарзүйн мэдээлэл</h1>
        <p className="text-sm text-slate-500">Миний илгээсэн тайлангуудын байршил.</p>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
        style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}
      >
        <CompanyMapSection points={points} detailRole="sender" />
      </div>
    </main>
  );
}
