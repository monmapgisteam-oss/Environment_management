import LocationMap from '@/components/map/LocationMapClient';
import type { ReportDetail } from './types';

// Address and map of the project, shown below the files and scores.
export default function ReportLocationCard({ report }: { report: ReportDetail }) {
  const location = report.location;
  const hasPoint = location?.latitude != null && location?.longitude != null;
  if (!location || !(location.addressDetail || hasPoint)) return null;

  return (
    <div className="border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-900">Байршил</h2>
      {location.addressDetail && <p className="mt-1 text-sm text-slate-700">{location.addressDetail}</p>}
      {hasPoint && (
        <>
          <p className="mt-1 text-xs text-slate-500">
            {location.latitude!.toFixed(6)}, {location.longitude!.toFixed(6)}
          </p>
          <div className="mt-3 overflow-hidden border border-slate-200" style={{ height: 300 }}>
            <LocationMap lat={location.latitude!} lng={location.longitude!} />
          </div>
        </>
      )}
    </div>
  );
}
