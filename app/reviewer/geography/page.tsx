import dataStore from '@/lib/arcgis/data';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CompanyMapSection from '@/components/CompanyMapSection';
import { fetchReviewedCompanyPoints } from '@/lib/reviewedLocations';

export default async function ReviewerGeographyPage() {
  const [points, reportTypes] = await Promise.all([
    fetchReviewedCompanyPoints(),
    dataStore.reportType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ]);

  const sidebarChildren = reportTypes
    .filter((rt: any) => rt.slug !== 'type-5')
    .map((rt: any) => ({
      label: rt.name,
      href: `/reviewer/reports?type=${rt.slug}`,
    }));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        items={[
          { label: 'Хяналтын самбар', href: '/reviewer' },
          { label: 'Ирсэн тайлангууд', href: '/reviewer/reports', children: sidebarChildren },
          { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
          { label: 'Газарзүйн мэдээлэл', href: '/reviewer/geography', active: true },
          { label: 'Тайлан хайх', href: '/reviewer/survey' },
          { label: 'Буцаасан тайлан', href: '/reviewer/returned' },
          { label: 'Нэмэлт мэдээ', href: '/reviewer/reports?type=type-5' },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Хянах менежер" companyName="Хянах байгууллага" companyType="reviewer" />
        <main className="flex-1 min-w-0 space-y-4 p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Газарзүйн мэдээлэл</h1>
            <p className="text-sm text-slate-500">
              Хянагдсан байгууллагуудын байршил, хяналтын үнэлгээгээр өнгөөр ялгасан.
            </p>
          </div>

          <div
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
            style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}
          >
            <CompanyMapSection points={points} detailRole="reviewer" />
          </div>
        </main>
      </div>
    </div>
  );
}
