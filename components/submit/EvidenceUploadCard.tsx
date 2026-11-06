import type { Attachment } from "@/lib/reports/attachments";
import { toast } from "@/lib/toast";
import { MAX_UPLOAD_BYTES } from "@/lib/reports/uploadFile";

// One upload slot per row: the scoring criteria, or a category's required
// supporting materials.
export type EvidenceRow = {
  id: string;
  label: string;
  detail?: string;
  required?: boolean;
  // Named uploads grouped inside this row's attachment box.
  uploadRows?: EvidenceRow[];
  // Approved templates from the regulation for this row; `download` names the
  // saved file, otherwise the link opens in a new tab.
  samples?: { href: string; label: string; download?: string }[];
};

type Props = {
  title: string;
  description?: string;
  // Link shown under the title, e.g. the scoring sheet of the category.
  headerLink?: { href: string; label: string };
  // Keeps file input ids unique when several cards are on one page.
  idPrefix: string;
  rows: EvidenceRow[];
  filesByRow: Record<string, File[]>;
  existingByRow?: Record<string, Attachment[]>;
  onFilesChange: (rowId: string, files: File[]) => void;
  onExistingChange?: (rowId: string, files: Attachment[]) => void;
};

// Senders attach PDF only (the upload API refuses anything else).
const accept = "application/pdf,.pdf";

const allowedPattern = /\.pdf$/i;

const sampleLinkClass =
  "mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-color-primary hover:underline";

// Outlined download button under a row's label.
const sampleButtonClass =
  "inline-flex items-center gap-1.5 border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-color-primary transition hover:border-color-primary hover:bg-teal-50";

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SampleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function validFiles(files: File[]) {
  return files.filter((file) => allowedPattern.test(file.name) && file.size <= MAX_UPLOAD_BYTES);
}

function RequiredBadge() {
  return <span className="shrink-0 rounded bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">Заавал</span>;
}

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4" />
    </svg>
  );
}

export default function EvidenceUploadCard({
  title,
  description,
  headerLink,
  idPrefix,
  rows,
  filesByRow,
  existingByRow = {},
  onFilesChange,
  onExistingChange,
}: Props) {
  const uploadSlot = (row: EvidenceRow, showLabel: boolean) => {
    const pickedFiles = filesByRow[row.id] || [];
    const existingFiles = existingByRow[row.id] || [];
    const inputId = `${idPrefix}-file-${row.id}`;
    const hasFiles = pickedFiles.length + existingFiles.length > 0;

    return (
      <div className={showLabel ? "grid min-w-0 gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:pl-16" : "min-w-0 sm:w-44"}>
        {showLabel && (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-medium leading-6 text-slate-800">{row.label}</p>
              {row.required ? <RequiredBadge /> : <span className="text-xs text-slate-400">Заавал биш</span>}
            </div>
            {!hasFiles && <p className="mt-1 text-xs text-slate-400">Файл сонгоогүй</p>}
          </div>
        )}

        <div className={`relative self-start ${showLabel ? "sm:w-44" : ""}`}>
          <input
            id={inputId}
            aria-label={row.label}
            aria-required={row.required || undefined}
            type="file"
            multiple
            accept={accept}
            className="peer sr-only"
            onChange={(event) => {
              const picked = Array.from(event.target.files || []);
              const nextFiles = validFiles(picked);
              if (nextFiles.length < picked.length) toast("Зөвхөн 25MB хүртэлх PDF файл хавсаргана уу.", "error");
              onFilesChange(row.id, [...pickedFiles, ...nextFiles]);
              event.currentTarget.value = "";
            }}
          />
          <label
            htmlFor={inputId}
            className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-color-primary shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50 active:bg-teal-100 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-600"
          >
            <UploadIcon />
            {hasFiles ? "Файл нэмэх" : "Файл сонгох"}
          </label>
        </div>

        {!showLabel && !hasFiles && <p className="mt-2 text-center text-xs text-slate-400">PDF · 25 MB хүртэл</p>}
        {hasFiles && (
          <div className={showLabel ? "space-y-2 sm:col-span-2" : "mt-3 space-y-2"}>
            {existingFiles.map((file, fileIndex) => (
              <div key={`${file.url}-${fileIndex}`} className="flex min-w-0 items-center gap-2 rounded border border-teal-100 bg-teal-50/50 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-xs text-slate-700" title={file.name}>{file.name}</span>
                {onExistingChange && (
                  <button
                    type="button"
                    aria-label={`${file.name} устгах`}
                    onClick={() => onExistingChange(row.id, existingFiles.filter((_, indexToKeep) => indexToKeep !== fileIndex))}
                    className="shrink-0 px-1 py-1 text-xs font-medium text-slate-500 hover:text-red-600"
                  >
                    Устгах
                  </button>
                )}
              </div>
            ))}
            {pickedFiles.map((file, fileIndex) => (
              <div key={`${file.name}-${fileIndex}`} className="flex min-w-0 items-center gap-2 rounded border border-teal-100 bg-teal-50/50 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-xs text-slate-700" title={file.name}>{file.name}</span>
                <button
                  type="button"
                  aria-label={`${file.name} устгах`}
                  onClick={() => onFilesChange(row.id, pickedFiles.filter((_, indexToKeep) => indexToKeep !== fileIndex))}
                  className="shrink-0 px-1 py-1 text-xs font-medium text-slate-500 hover:text-red-600"
                >
                  Устгах
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-semibold text-color-text-main">{title}</h3>
        <p className="mt-1 text-xs text-color-text-muted">Баримт бичиг тус бүрийг PDF файлаар хавсаргана уу. Нэг файл 25 MB хүртэл.</p>
        {description && <p className="mt-1 text-sm text-color-text-muted">{description}</p>}
        {headerLink && (
          <a href={headerLink.href} target="_blank" rel="noopener noreferrer" className={sampleLinkClass}>
            <SampleIcon />
            {headerLink.label}
          </a>
        )}
      </div>

      <div className="divide-y divide-slate-200">
        {rows.map((row, index) => {
          return (
            <section key={row.id} className={row.uploadRows ? "" : "grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"}>
              <div className={row.uploadRows ? "border-b border-slate-100 bg-slate-50/80 px-5 py-4" : "min-w-0"}>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-teal-50 text-xs font-semibold text-color-primary">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-semibold leading-6 text-slate-900">{row.label}</p>
                      {row.required && <RequiredBadge />}
                    </div>
                    {row.detail && <p className="mt-1 text-xs leading-5 text-slate-500">{row.detail}</p>}
                    {row.samples && row.samples.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {row.samples.map((sample) => (
                          <a
                            key={sample.href}
                            href={sample.href}
                            download={sample.download}
                            target={sample.download ? undefined : "_blank"}
                            rel="noopener noreferrer"
                            className={sampleButtonClass}
                          >
                            <DownloadIcon />
                            {sample.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {row.uploadRows ? (
                <div className="divide-y divide-slate-100">
                  {row.uploadRows.map((uploadRow) => (
                    <div key={uploadRow.id}>{uploadSlot(uploadRow, true)}</div>
                  ))}
                </div>
              ) : uploadSlot(row, false)}
            </section>
          );
        })}
      </div>
    </div>
  );
}
