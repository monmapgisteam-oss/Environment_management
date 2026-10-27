import AttachmentRow from '@/components/reports/AttachmentRow';
import type { Attachment } from '@/lib/reports/attachments';
import { groupMaterialAttachments, leftoverMaterialGroups, materialsFor, materialsTitle } from '@/lib/reports/materials';

// Documents the sender attached, listed in the regulation's order: every
// required item is shown, with its files beside it or a "not attached" note.
// Rows stay one line tall on wide screens and the whole list can be collapsed,
// so a long regulation list does not push the rest of the page far down.
export default function MaterialAttachmentList({
  attachments,
  reportType,
  reportCategory,
}: {
  attachments: Attachment[];
  reportType: string | null;
  reportCategory: string | null;
}) {
  const groups = groupMaterialAttachments(attachments, reportType, reportCategory);
  const leftover = leftoverMaterialGroups(attachments, reportType, reportCategory);
  if (groups.length === 0 && leftover.length === 0) return null;
  const filesById = new Map([...groups, ...leftover].map(({ material, files }) => [material.id, files]));
  const materials = [...materialsFor(reportType, reportCategory), ...leftover.map((group) => group.material)];
  const attachedCount = groups.length + leftover.length;

  return (
    <details open className="group border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <h2 className="text-base font-semibold text-slate-900">{materialsTitle(reportType)}</h2>
        <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
          {attachedCount} / {materials.length} хавсаргасан
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-open:rotate-180"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </summary>
      <ol className="divide-y divide-slate-100 border-t border-slate-200">
        {materials.map((material, index) => {
          const files = filesById.get(material.id) ?? [];
          return (
            <li
              key={material.id}
              className="grid gap-x-4 gap-y-1 px-5 py-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-center"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-semibold ${
                    files.length ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm ${files.length ? 'font-medium text-slate-900' : 'text-slate-500'}`}>{material.label}</p>
                  {material.note && <p className="mt-0.5 text-xs text-slate-400">{material.note}</p>}
                </div>
              </div>
              {files.length > 0 ? (
                <ul className="ml-8 divide-y divide-slate-100 lg:ml-0">
                  {files.map((file, fileIndex) => (
                    <AttachmentRow key={`${file.url}-${fileIndex}`} file={file} compact />
                  ))}
                </ul>
              ) : (
                <span className="ml-8 text-xs text-slate-400 lg:ml-0 lg:text-right">Хавсаргаагүй</span>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
