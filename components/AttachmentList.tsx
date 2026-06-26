import type { Attachment } from '@/lib/attachments';

// Shows the report's attached files as openable links. Reused on the report
// detail page and on both (manager + staff) evaluation pages so a reviewer can
// always open the sender's documents while reviewing.
export default function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4">Хавсралт файл</h2>
      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500">Хавсаргасан файл байхгүй байна.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((file, index) => (
            <a
              key={index}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">{file.name}</span>
              <span className="text-xs font-medium text-color-primary">Нээх</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
