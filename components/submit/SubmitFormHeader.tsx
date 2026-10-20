type SubmitFormHeaderProps = {
  title: string;
  isAdditional: boolean;
  isGeneralEvaluation: boolean;
};

export default function SubmitFormHeader({ title, isAdditional, isGeneralEvaluation }: SubmitFormHeaderProps) {
  return (
    <div className="px-10 py-6 border-b border-[#E8F0FE]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-color-primary flex items-center justify-center flex-shrink-0">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-color-text-main">
              {title}
            </h1>
            <p className="text-sm text-color-text-muted mt-0.5">
              {isAdditional
                ? "Нэмэлт мэдээллээ бичнэ үү."
                : isGeneralEvaluation
                ? "Ерөнхий үнэлгээний дүгнэлтийн PDF эсвэл Word файлыг хавсаргана уу."
                : "Тайлангийн мэдээлэл болон байршлын хаягийг оруулна уу."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
