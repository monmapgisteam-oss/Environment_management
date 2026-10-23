type SubmitActionsProps = {
  isGeneralEvaluation: boolean;
  submitting: boolean;
  savingDraft: boolean;
  onSaveDraft: () => void;
  // Step-by-step forms: before the last step the submit button moves on to the
  // next step, and a back button returns to the previous one.
  isLastStep?: boolean;
  onBack?: () => void;
};

// Form footer: save-draft (reports only) and the submit button.
export default function SubmitActions({
  isGeneralEvaluation,
  submitting,
  savingDraft,
  onSaveDraft,
  isLastStep = true,
  onBack,
}: SubmitActionsProps) {
  return (
    // Sticks to the bottom of the screen so the buttons stay in reach on long steps.
    <div className="sticky bottom-0 z-20 -mx-6 -mb-6 mt-8 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:-mb-8 sm:gap-3 sm:px-8 sm:py-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mr-auto h-11 shrink-0 px-4 border border-slate-200 bg-white text-color-text-main text-sm font-semibold hover:bg-slate-50 transition sm:px-6"
        >
          Өмнөх
        </button>
      )}
      {!isGeneralEvaluation && (
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={savingDraft}
          className="h-11 shrink-0 px-3 border border-slate-200 bg-white text-color-text-main text-sm font-semibold hover:bg-slate-50 transition inline-flex items-center gap-2 disabled:opacity-50 sm:px-6"
          aria-label="Ноорог хадгалах"
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
          <span className="hidden sm:inline">{savingDraft ? "Хадгалж байна..." : "Ноорог хадгалах"}</span>
          <span className="sm:hidden">Ноорог</span>
        </button>
      )}
      {!isLastStep ? (
        <button
          type="submit"
          className="h-11 flex-1 px-7 bg-color-primary text-white text-sm font-semibold hover:bg-color-primary-dark transition sm:flex-none"
        >
          Дараах
        </button>
      ) : (
        <button
          type="submit"
          disabled={submitting}
          className="h-11 flex-1 px-5 bg-color-primary text-white text-sm font-semibold hover:bg-color-primary-dark transition inline-flex items-center justify-center gap-2 disabled:opacity-50 sm:flex-none sm:px-7"
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
      )}
    </div>
  );
}
