import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import GeographyMapSection from '@/components/GeographyMapSection';
import ArcgisWebMap from '@/components/ArcgisWebMap';
import { fetchReviewedCompanyPoints } from '@/lib/reviewedLocations';

export default async function ReviewerGeographyPage() {
  const [points, reportTypes] = await Promise.all([
    fetchReviewedCompanyPoints(),
    prisma.reportType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ]);

  const sidebarChildren = reportTypes.map((rt: any) => ({
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
          { label: 'Буцаасан тайлан', href: '/reviewer' },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Хянах менежер" companyName="Хянах байгууллага" companyType="reviewer" />
        <main className="flex-1 min-w-0 space-y-4 p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Газарзүйн мэдээлэл</h1>
            <p className="text-sm text-slate-500">
              Хянагдсан байгууллагуудын байршил. Цэг дээр дарж тухайн байгууллагын судалгааны
              мэдээллийг харна уу.
            </p>
          </div>

          <div
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{ height: 460 }}
          >
            <GeographyMapSection points={points} />
          </div>

          <div className="space-y-1 pt-2">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">ArcGIS газрын зураг</h2>
            <p className="text-sm text-slate-500">ArcGIS Online дээр үүсгэсэн вэб газрын зураг.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" style={{ height: 560 }}>
            <ArcgisWebMap webmapId={process.env.NEXT_PUBLIC_ARCGIS_WEBMAP_ID} />
          </div>
        </main>
      </div>
    </div>
  );
}
