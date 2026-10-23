import type { Attachment } from "@/lib/reports/attachments";
import { toast } from "@/lib/toast";

// One upload slot per row: the scoring criteria, or a category's required
// supporting materials.
export type EvidenceRow = {
  id: string;
  label: string;
  detail?: string;
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
  return files.filter((file) => allowedPattern.test(file.name));
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
  return (
    <div className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-semibold text-color-text-main">{title}</h3>
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
          const pickedFiles = filesByRow[row.id] || [];
          const existingFiles = existingByRow[row.id] || [];
          const inputId = `${idPrefix}-file-${row.id}`;

          return (
            <div key={row.id} className="grid gap-4 px-6 py-4 lg:grid-cols-[1fr_360px] lg:items-start">
              <div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center bg-teal-50 text-sm font-bold text-color-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-6 text-slate-900">{row.label}</p>
                    {row.detail && <p className="mt-1 text-xs font-medium text-slate-500">{row.detail}</p>}
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

              <div className="border border-dashed border-slate-200 bg-slate-50 p-3">
                <input
                  id={inputId}
                  type="file"
                  multiple
                  accept={accept}
                  className="hidden"
                  onChange={(event) => {
                    const picked = Array.from(event.target.files || []);
                    const nextFiles = validFiles(picked);
                    if (nextFiles.length < picked.length) toast("Зөвхөн PDF файл хавсаргана уу.", "error");
                    onFilesChange(row.id, [...pickedFiles, ...nextFiles]);
                    event.currentTarget.value = "";
                  }}
                />
                <label
                  htmlFor={inputId}
                  className="flex cursor-pointer items-center justify-center border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-color-primary transition hover:bg-teal-50"
                >
                  Файл сонгох
                </label>

                {existingFiles.length === 0 && pickedFiles.length === 0 ? (
                  <p className="mt-3 text-center text-xs text-color-text-muted">Файл хавсаргаагүй байна.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {existingFiles.map((file, fileIndex) => (
                      <div key={`${file.url}-${fileIndex}`} className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{file.name}</span>
                        {onExistingChange && (
                          <button
                            type="button"
                            onClick={() =>
                              onExistingChange(
                                row.id,
                                existingFiles.filter((_, indexToKeep) => indexToKeep !== fileIndex),
                              )
                            }
                            className="text-xs font-semibold text-red-500 hover:text-red-600"
                          >
                            Устгах
                          </button>
                        )}
                      </div>
                    ))}
                    {pickedFiles.map((file, fileIndex) => (
                      <div key={`${file.name}-${fileIndex}`} className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            onFilesChange(
                              row.id,
                              pickedFiles.filter((_, indexToKeep) => indexToKeep !== fileIndex),
                            )
                          }
                          className="text-xs font-semibold text-red-500 hover:text-red-600"
                        >
                          Устгах
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
