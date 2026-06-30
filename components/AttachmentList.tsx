import type { Attachment } from '@/lib/attachments';
import { downloadUrl } from '@/lib/attachments';

// Shows the report's attached files so the monitoring team can open or download
// the sender's documents. Reused on the report detail page and on both (manager
// + staff) evaluation pages.
export default function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4">Хавсралт файл</h2>
      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500">Хавсаргасан файл байхгүй байна.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Татах
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
