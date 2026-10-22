import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import LocationMap from '@/components/map/LocationMapClient';
import { canAccessReport, requireUser, VIEWER_ROLE } from '@/lib/auth';

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchReportLocation(reportId: string) {
  return dataStore.report.findUnique({
    where: { id: reportId },
    select: { id: true, reportNumber: true, title: true, senderCompanyId: true, implementerRegister: true, location: true },
  });
}

// Full-screen map opened from the score table's "Байршил" column — one pin
// at the report's location, on our own Esri basemap.
export default async function ReportLocationPage(props: Props) {
  const params = await props.params;
  const user = await requireUser();
  const role = VIEWER_ROLE[user.role];

  const report = await fetchReportLocation(params.id);
  if (!report || !(await canAccessReport(user, report))) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }

  const backHref = `/report/${report.id}/scores?role=${role}`;
  const lat = report.location?.latitude;
  const lng = report.location?.longitude;

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Байршил" subtitle={<>{report.reportNumber} — {report.title}</>} />

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
  );
}
