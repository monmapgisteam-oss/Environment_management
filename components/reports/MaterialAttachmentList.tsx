import AttachmentRow from '@/components/reports/AttachmentRow';
import type { Attachment } from '@/lib/reports/attachments';
import { groupMaterialAttachments, leftoverMaterialGroups, materialsFor, materialsTitle } from '@/lib/reports/materials';

// Documents the sender attached, listed in the regulation's order: every
// required item is shown, with its files underneath or a "not attached" note.
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
    <section className="border border-slate-200 bg-white">
      <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">{materialsTitle(reportType)}</h2>
        <span className="text-xs text-slate-500">
          {attachedCount} / {materials.length} хавсаргасан
        </span>
      </div>
      <ol className="divide-y divide-slate-200">
        {materials.map((material, index) => {
          const files = filesById.get(material.id) ?? [];
          return (
            <li key={material.id}>
              <div className="flex items-start gap-3 px-5 pt-4 pb-2">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-xs font-semibold ${
                    files.length ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{material.label}</p>
                  {material.note && <p className="mt-0.5 text-xs text-slate-500">{material.note}</p>}
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {files.length ? `${files.length} файл` : 'Хавсаргаагүй'}
                </span>
              </div>
              {files.length > 0 && (
                <ul className="mb-3 ml-14 mr-5 divide-y divide-slate-100 border border-slate-200 bg-slate-50/60">
                  {files.map((file, fileIndex) => (
                    <AttachmentRow key={`${file.url}-${fileIndex}`} file={file} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
