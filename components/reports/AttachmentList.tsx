import type { Attachment } from '@/lib/reports/attachments';
import { downloadUrl, isImageAttachment } from '@/lib/reports/attachments';
import AttachmentRow from '@/components/reports/AttachmentRow';

// Shows sender-uploaded report attachments. Reused on report detail and evaluation pages.
// Photos get a thumbnail grid; documents are listed as compact rows.
export default function AttachmentList({
  attachments,
  title = 'Хавсаргасан файл',
  emptyText = 'Хавсаргасан файл байхгүй байна.',
}: {
  attachments: Attachment[];
  title?: string;
  emptyText?: string;
}) {
  const images = attachments.filter(isImageAttachment);
  const documents = attachments.filter((file) => !isImageAttachment(file));
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {attachments.length > 0 && <span className="text-xs text-slate-500">{attachments.length} файл</span>}
      </div>
      {attachments.length === 0 && <p className="text-sm text-slate-500">{emptyText}</p>}
      {documents.length > 0 && (
        <ul className="divide-y divide-slate-100 border border-slate-200">
          {documents.map((file, index) => (
            <AttachmentRow key={`${file.url}-${index}`} file={file} />
          ))}
        </ul>
      )}
      {images.length > 0 && (
        <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${documents.length ? 'mt-4' : ''}`}>
          {images.map((file, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
            >
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-50">
                <img src={file.url} alt={file.name} className="h-40 w-full object-cover" loading="lazy" />
              </a>
              <div className="flex items-center gap-2 p-3">
                <span className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">{file.name}</span>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-color-primary hover:underline"
                >
                  Нээх
                </a>
                <a
                  href={downloadUrl(file)}
                  className="inline-flex items-center gap-1 rounded-lg bg-color-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition"
                >
                  Татах
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
