import type { Attachment } from '@/lib/attachments';
import { downloadUrl, isImageAttachment } from '@/lib/attachments';

// Shows sender-uploaded report attachments. Reused on report detail and evaluation pages.
export default function AttachmentList({
  attachments,
  title = 'Хавсаргасан файл',
  emptyText = 'Хавсаргасан файл байхгүй байна.',
}: {
  attachments: Attachment[];
  title?: string;
  emptyText?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4">{title}</h2>
      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
            >
              {isImageAttachment(file) ? (
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-50">
                  <img src={file.url} alt={file.name} className="h-40 w-full object-cover" loading="lazy" />
                </a>
              ) : (
                <div className="flex h-40 items-center justify-center bg-slate-50 text-slate-400">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
              )}
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
