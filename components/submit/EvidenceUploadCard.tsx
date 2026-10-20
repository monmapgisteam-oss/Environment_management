import type { Attachment } from "@/lib/reports/attachments";

// One upload slot per row: the scoring criteria, or a category's required
// supporting materials.
export type EvidenceRow = {
  id: string;
  label: string;
  detail?: string;
};

type Props = {
  title: string;
  description?: string;
  // Keeps file input ids unique when several cards are on one page.
  idPrefix: string;
  rows: EvidenceRow[];
  filesByRow: Record<string, File[]>;
  existingByRow?: Record<string, Attachment[]>;
  onFilesChange: (rowId: string, files: File[]) => void;
  onExistingChange?: (rowId: string, files: Attachment[]) => void;
};

const accept =
  "image/*,.pdf,.doc,.docx,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const allowedPattern = /\.(jpe?g|png|webp|gif|bmp|heic|heif|pdf|docx?|odt)$/i;

function validFiles(files: File[]) {
  return files.filter((file) => file.type.startsWith("image/") || allowedPattern.test(file.name));
}

export default function EvidenceUploadCard({
  title,
  description,
  idPrefix,
  rows,
  filesByRow,
  existingByRow = {},
  onFilesChange,
  onExistingChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-[#E8F0FE] bg-white">
      <div className="border-b border-[#E8F0FE] px-6 py-4">
        <h3 className="text-base font-semibold text-color-text-main">{title}</h3>
        {description && <p className="mt-1 text-sm text-color-text-muted">{description}</p>}
      </div>

      <div className="divide-y divide-[#E8F0FE]">
        {rows.map((row, index) => {
          const pickedFiles = filesByRow[row.id] || [];
          const existingFiles = existingByRow[row.id] || [];
          const inputId = `${idPrefix}-file-${row.id}`;

          return (
            <div key={row.id} className="grid gap-4 px-6 py-4 lg:grid-cols-[1fr_360px] lg:items-start">
              <div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 text-sm font-bold text-color-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-6 text-slate-900">{row.label}</p>
                    {row.detail && <p className="mt-1 text-xs font-medium text-slate-500">{row.detail}</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-[#D9E4F0] bg-[#F8FBFF] p-3">
                <input
                  id={inputId}
                  type="file"
                  multiple
                  accept={accept}
                  className="hidden"
                  onChange={(event) => {
                    const nextFiles = validFiles(Array.from(event.target.files || []));
                    onFilesChange(row.id, [...pickedFiles, ...nextFiles]);
                    event.currentTarget.value = "";
                  }}
                />
                <label
                  htmlFor={inputId}
                  className="flex cursor-pointer items-center justify-center rounded-lg border border-[#D9E4F0] bg-white px-3 py-2 text-sm font-semibold text-color-primary transition hover:bg-teal-50"
                >
                  Файл сонгох
                </label>

                {existingFiles.length === 0 && pickedFiles.length === 0 ? (
                  <p className="mt-3 text-center text-xs text-color-text-muted">Файл хавсаргаагүй байна.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {existingFiles.map((file, fileIndex) => (
                      <div key={`${file.url}-${fileIndex}`} className="flex items-center gap-2 rounded-lg border border-[#E8F0FE] bg-white px-3 py-2">
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
                      <div key={`${file.name}-${fileIndex}`} className="flex items-center gap-2 rounded-lg border border-[#E8F0FE] bg-white px-3 py-2">
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
