type SubmitActionsProps = {
  isGeneralEvaluation: boolean;
  submitting: boolean;
  savingDraft: boolean;
  onSaveDraft: () => void;
};

// Form footer: save-draft (reports only) and the submit button.
export default function SubmitActions({
  isGeneralEvaluation,
  submitting,
  savingDraft,
  onSaveDraft,
}: SubmitActionsProps) {
  return (
    <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-[#E8F0FE]">
      {!isGeneralEvaluation && (
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={savingDraft}
          className="h-11 px-6 rounded-xl border border-[#D9E4F0] bg-white text-color-text-main text-sm font-semibold hover:bg-slate-50 transition inline-flex items-center gap-2 disabled:opacity-50"
        >
          {savingDraft ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-color-primary border-t-transparent" />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          )}
          {savingDraft ? "Хадгалж байна..." : "Ноорог хадгалах"}
        </button>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="h-11 px-7 rounded-xl bg-color-primary text-white text-sm font-semibold hover:bg-color-primary-dark transition inline-flex items-center gap-2 disabled:opacity-50"
        style={{ boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
      >
        {submitting ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
        {submitting
          ? "Илгээж байна..."
          : isGeneralEvaluation
          ? "Дүгнэлт илгээх"
          : "Тайлан илгээх"}
      </button>
    </div>
  );
}
