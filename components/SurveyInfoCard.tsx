import type { SurveyInfo } from '@/lib/surveySync';
import { formatDate } from '@/lib/utils';

// The company's own Survey123 submission, matched by register number.
// Reviewer-side only (manager + staff) — the sender already knows their own
// information and shouldn't see it echoed back.
export default function SurveyInfoCard({ info }: { info: SurveyInfo | null }) {
  if (!info) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Survey123</span>
        <h2 className="text-base font-semibold text-slate-900">Судалгааны системийн мэдээлэл</h2>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
        {info.reportType && (
          <div>
            <p className="text-slate-500 text-xs">Тайлангийн төрөл</p>
            <p className="font-medium text-slate-800 mt-0.5">{info.reportType}</p>
          </div>
        )}
        {info.projectName && (
          <div>
            <p className="text-slate-500 text-xs">Төслийн нэр</p>
            <p className="font-medium text-slate-800 mt-0.5">{info.projectName}</p>
          </div>
        )}
        {info.organization && (
          <div>
            <p className="text-slate-500 text-xs">Хэрэгжүүлэгчийн нэр</p>
            <p className="font-medium text-slate-800 mt-0.5">{info.organization}</p>
          </div>
        )}
        {info.register && (
          <div>
            <p className="text-slate-500 text-xs">Хэрэгжүүлэгчийн РД</p>
            <p className="font-medium text-slate-800 mt-0.5">{info.register}</p>
          </div>
        )}
        {info.projectDate && (
          <div>
            <p className="text-slate-500 text-xs">Огноо</p>
            <p className="font-medium text-slate-800 mt-0.5">{formatDate(new Date(info.projectDate))}</p>
          </div>
        )}
      </div>
      {info.description && (
        <div className="mt-5 pt-5 border-t border-slate-100 text-sm">
          <p className="text-slate-500 text-xs">Тайлбар</p>
          <p className="font-medium text-slate-800 mt-0.5 whitespace-pre-wrap">{info.description}</p>
        </div>
      )}
      {info.photos.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Хавсаргасан зураг</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {info.photos.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {info.photos.map((photo, index) => (
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
    </div>
  );
}
