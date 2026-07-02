import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CompanyMapSection from '@/components/CompanyMapSection';
import { getCurrentUser } from '@/lib/auth';
import { fetchSenderCompanyPoints } from '@/lib/senderLocations';

export default async function SenderGeographyPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'sender' || !user.companyId) {
    redirect('/login/sender');
  }

  const points = await fetchSenderCompanyPoints(user.companyId);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        items={[
          { label: 'Хяналтын самбар', href: '/sender' },
          {
            label: 'Тайлан илгээх',
            href: '/sender/submit',
            children: [
              { label: 'Жилийн төлөвлөгөө', href: '/sender/submit?type=plan' },
              { label: 'Биелэлтийн тайлан', href: '/sender/submit?type=performance' },
            ],
          },
          { label: 'Нэмэлт мэдээлэл', href: '/sender/submit?type=additional' },
          { label: 'Миний тайлангууд', href: '/sender/reports' },
          { label: 'Газарзүйн мэдээлэл', href: '/sender/geography', active: true },
          { label: 'Ноорог', href: '/sender/drafts' },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Илгээх хэрэглэгч" companyName="Илгээх байгууллага" companyType="sender" />
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
      </div>
    </div>
  );
}
