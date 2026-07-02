import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import LocationMap from '@/components/LocationMapClient';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string }>;
};

async function fetchReportLocation(reportId: string) {
  return prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, reportNumber: true, title: true, location: true },
  });
}

// Full-screen map opened from the score table's "Байршил" column — one pin
// at the report's location, on our own Esri basemap.
export default async function ReportLocationPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const role = searchParams.role === 'staff' ? 'staff' : searchParams.role === 'reviewer' ? 'reviewer' : 'sender';

  const report = await fetchReportLocation(params.id);
  if (!report) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }

  const sidebarItems =
    role === 'reviewer'
      ? [
          { label: 'Хяналтын самбар', href: '/reviewer' },
          { label: 'Судалгаа хайх', href: '/reviewer/survey', active: true },
        ]
      : role === 'staff'
      ? [
          { label: 'Надад оноогдсон тайлангууд', href: '/evaluator' },
          { label: 'Судалгаа хайх', href: '/evaluator/survey', active: true },
        ]
      : [{ label: 'Хяналтын самбар', href: '/sender' }];

  const backHref = `/report/${report.id}/scores?role=${role}`;
  const lat = report.location?.latitude;
  const lng = report.location?.longitude;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={sidebarItems} />

      <div className="flex min-w-0 flex-1 flex-col">
        {role === 'reviewer' || role === 'staff' ? (
          <Header userName={role === 'staff' ? 'Үнэлгээний ажилтан' : 'Хянах менежер'} companyName="Хянах байгууллага" role={role} />
        ) : (
          <Header userName="Илгээх хэрэглэгч" companyName="Илгээх байгууллага" companyType="sender" />
        )}
        <main className="flex-1 min-w-0 p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Байршил</h1>
            <p className="text-sm text-slate-500">{report.reportNumber} — {report.title}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft" style={{ height: 'calc(100vh - 220px)' }}>
            {lat != null && lng != null ? (
              <LocationMap lat={lat} lng={lng} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Байршлын мэдээлэл алга.
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <a href={backHref} className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition inline-flex items-center">
              Буцах
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
