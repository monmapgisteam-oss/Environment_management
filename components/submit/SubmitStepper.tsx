type SubmitStepperProps = {
  steps: string[];
  currentStep: number;
  // Only steps already passed can be reopened; moving forward goes through
  // "Дараах" so each step is checked first.
  onStepClick: (index: number) => void;
};

export default function SubmitStepper({ steps, currentStep, onStepClick }: SubmitStepperProps) {
  return (
    <ol className="flex flex-wrap items-start gap-y-3">
      {steps.map((step, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        return (
          <li key={step} className="flex items-start">
            {index > 0 && (
              <div className={`mt-[17px] h-[2px] w-10 sm:w-16 ${index <= currentStep ? "bg-color-primary" : "bg-[#D9E4F0]"}`} />
            )}
            <button
              type="button"
              onClick={() => onStepClick(index)}
              disabled={!done}
              className="flex w-28 flex-col items-center gap-1.5 text-center disabled:cursor-default"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition ${
                  done || active
                    ? "bg-color-primary text-white"
                    : "border-2 border-[#D9E4F0] bg-white text-color-text-muted"
                }`}
              >
                {done ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className={`text-[11px] font-medium leading-tight ${active ? "text-color-primary" : "text-color-text-muted"}`}>
                {step}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
