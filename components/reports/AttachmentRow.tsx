import type { Attachment } from '@/lib/reports/attachments';
import { downloadUrl, isImageAttachment } from '@/lib/reports/attachments';

// File extension label and tint for the row icon.
function fileKind(name: string) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return { label: 'PDF', className: 'bg-rose-50 text-rose-600' };
  if (ext === 'doc' || ext === 'docx' || ext === 'odt') return { label: 'DOC', className: 'bg-sky-50 text-sky-600' };
  if (ext === 'xls' || ext === 'xlsx') return { label: 'XLS', className: 'bg-emerald-50 text-emerald-600' };
  if (/^(jpe?g|png|webp|gif|bmp|heic|heif)$/.test(ext)) return { label: 'IMG', className: 'bg-violet-50 text-violet-600' };
  return { label: ext.slice(0, 4).toUpperCase() || 'FILE', className: 'bg-slate-100 text-slate-500' };
}

// One uploaded file as a compact row: icon or thumbnail, name, open and download.
// `compact` drops the padding, shrinks the icon and leaves out "Нээх" (the name
// already opens the file) so it fits beside a label in a dense list.
export default function AttachmentRow({ file, compact = false }: { file: Attachment; compact?: boolean }) {
  const kind = fileKind(file.name);
  const iconSize = compact ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <li className={`flex items-center ${compact ? 'gap-2 py-1' : 'gap-3 px-4 py-2.5'}`}>
      {isImageAttachment(file) ? (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <img src={file.url} alt="" className={`${iconSize} object-cover`} loading="lazy" />
        </a>
      ) : (
        <span
          className={`flex ${iconSize} shrink-0 items-center justify-center font-bold tracking-wide ${
            compact ? 'text-[9px]' : 'text-[10px]'
          } ${kind.className}`}
        >
          {kind.label}
        </span>
      )}
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 hover:text-color-primary"
        title={file.name}
      >
        {file.name}
      </a>
      {!compact && (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-500 hover:text-color-primary">
          Нээх
        </a>
      )}
      <a
        href={downloadUrl(file)}
        title="Татах"
        className="inline-flex shrink-0 items-center gap-1 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-color-primary hover:text-color-primary"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Татах
      </a>
    </li>
  );
}
