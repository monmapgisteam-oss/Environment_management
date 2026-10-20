import type { Attachment } from "@/lib/reports/attachments";

type Criterion = {
  id: string;
  name: string;
  maxScore: number;
  sortOrder?: number;
};

type Props = {
  criteria: Criterion[];
  filesByCriterion: Record<string, File[]>;
  existingByCriterion?: Record<string, Attachment[]>;
  onFilesChange: (criterionId: string, files: File[]) => void;
  onExistingChange?: (criterionId: string, files: Attachment[]) => void;
};

const accept =
  "image/*,.pdf,.doc,.docx,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const allowedPattern = /\.(jpe?g|png|webp|gif|bmp|heic|heif|pdf|docx?|odt)$/i;

function validFiles(files: File[]) {
  return files.filter((file) => file.type.startsWith("image/") || allowedPattern.test(file.name));
}

export default function CriterionEvidenceUploadCard({
  criteria,
  filesByCriterion,
  existingByCriterion = {},
  onFilesChange,
  onExistingChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-[#E8F0FE] bg-white">
      <div className="border-b border-[#E8F0FE] px-6 py-4">
        <h3 className="text-base font-semibold text-color-text-main">
          Үнэлгээний шалгуурын нотлох файл
        </h3>
        <p className="mt-1 text-sm text-color-text-muted">
          Шалгуур бүрийн баруун талд зураг, PDF эсвэл Word файл хавсаргана уу.
        </p>
      </div>

      <div className="divide-y divide-[#E8F0FE]">
        {criteria.map((criterion, index) => {
          const pickedFiles = filesByCriterion[criterion.id] || [];
          const existingFiles = existingByCriterion[criterion.id] || [];

          return (
            <div key={criterion.id} className="grid gap-4 px-6 py-4 lg:grid-cols-[1fr_360px] lg:items-start">
              <div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 text-sm font-bold text-color-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-6 text-slate-900">{criterion.name}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Авбал зохих оноо: {criterion.maxScore}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-[#D9E4F0] bg-[#F8FBFF] p-3">
                <input
                  id={`criterion-file-${criterion.id}`}
                  type="file"
                  multiple
                  accept={accept}
                  className="hidden"
                  onChange={(event) => {
                    const nextFiles = validFiles(Array.from(event.target.files || []));
                    onFilesChange(criterion.id, [...pickedFiles, ...nextFiles]);
                    event.currentTarget.value = "";
                  }}
                />
                <label
                  htmlFor={`criterion-file-${criterion.id}`}
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
                                criterion.id,
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
                              criterion.id,
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
