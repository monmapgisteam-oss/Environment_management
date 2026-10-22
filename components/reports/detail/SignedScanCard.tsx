import { downloadUrl } from '@/lib/reports/attachments';

type Props = {
  url: string;
  name: string | null;
};

// Manager's scanned, physically-signed copy, offered to the sender for download.
export default function SignedScanCard({ url, name }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-4">Гарын үсэгтэй хуулбар</h2>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">
          {name || 'Гарын үсэгтэй хуулбар'}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-color-primary hover:underline"
        >
          Нээх
        </a>
        <a
          href={downloadUrl({ url, name: name || 'signed-scan' })}
          className="inline-flex items-center gap-1 rounded-lg bg-color-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition"
        >
          Татах
        </a>
      </div>
    </div>
  );
}
