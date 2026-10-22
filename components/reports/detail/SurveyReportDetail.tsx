import StatusBadge from '@/components/ui/StatusBadge';
import LocationMap from '@/components/map/LocationMapClient';
import { formatDate } from '@/lib/utils';
import type { SurveyReport } from '@/lib/survey/reports';

type Props = {
  survey: SurveyReport;
};

// Read-only view of a Survey123 record that has not been materialized into a report.
export default function SurveyReportDetail({ survey }: Props) {
  return (
    <main className="flex-1 min-w-0 p-6 space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Survey системээс тайлан ирлээ</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{survey.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{survey.reportNumber}</p>
          </div>
          <StatusBadge status="submitted" />
        </div>
        <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Тайлангийн төрөл</p>
            <p className="mt-0.5 font-medium text-slate-800">{survey.reportType.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Байгууллага</p>
            <p className="mt-0.5 font-medium text-slate-800">{survey.senderCompany?.name || survey.organization || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">РД</p>
            <p className="mt-0.5 font-medium text-slate-800">{survey.register || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Илгээсэн огноо</p>
            <p className="mt-0.5 font-medium text-slate-800">{formatDate(survey.submittedAt)}</p>
          </div>
        </div>
      </div>

      {survey.description && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Тайлбар</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800">{survey.description}</p>
        </div>
      )}

      {survey.photos.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Хавсаргасан зураг</h2>
            <span className="bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {survey.photos.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {survey.photos.map((photo, index) => (
              <a
                key={`${photo.src}-${index}`}
                href={photo.src}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              >
                <img
                  src={photo.src}
                  alt={photo.alt || `Survey123 зураг ${index + 1}`}
                  className="h-32 w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {survey.lat != null && survey.lng != null && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Газрын зураг дээрх байршил</h2>
          </div>
          <div className="h-80">
            <LocationMap lat={survey.lat} lng={survey.lng} />
          </div>
        </div>
      )}
    </main>
  );
}
