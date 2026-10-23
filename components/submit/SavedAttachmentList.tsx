import type { Attachment } from "@/lib/reports/attachments";

type SavedAttachmentListProps = {
  attachments: Attachment[];
  onRemove: (index: number) => void;
  // Extra spacing classes placed before the card's own classes.
  className?: string;
};

// Files already stored on the report being edited; each can be dropped before resubmitting.
export default function SavedAttachmentList({ attachments, onRemove, className }: SavedAttachmentListProps) {
  const cardClass = "border border-slate-200 p-4";
  return (
    <div className={className ? `${className} ${cardClass}` : cardClass}>
      <p className="text-sm font-semibold text-color-text-main mb-2">
        Хадгалагдсан файл
      </p>
      <div className="space-y-2">
        {attachments.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200"
          >
            <span className="text-sm text-color-text-main flex-1 min-w-0 truncate">
              {file.name}
            </span>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="text-color-text-muted hover:text-red-500 transition text-xs p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
