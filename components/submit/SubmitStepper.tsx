type SubmitStepperProps = {
  steps: string[];
  currentStep: number;
  // Only steps already passed can be reopened; moving forward goes through
  // "Дараах" so each step is checked first.
  onStepClick: (index: number) => void;
};

export default function SubmitStepper({ steps, currentStep, onStepClick }: SubmitStepperProps) {
  return (
    <ol className="flex w-full items-start">
      {steps.map((step, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        return (
          <li key={step} className="relative flex flex-1 flex-col items-center">
            {/* Line to the previous step, drawn behind the circles */}
            {index > 0 && (
              <div
                className={`absolute right-1/2 top-[18px] h-[2px] w-full -translate-y-1/2 ${
                  index <= currentStep ? "bg-color-primary" : "bg-[#D9E4F0]"
                }`}
              />
            )}
            <button
              type="button"
              onClick={() => onStepClick(index)}
              disabled={!done}
              className="relative z-10 flex flex-col items-center gap-2 px-2 text-center disabled:cursor-default"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ring-4 ring-white transition ${
                  done
                    ? "bg-color-primary text-white"
                    : active
                    ? "bg-color-primary text-white shadow-[0_0_0_4px_rgba(15,118,110,0.15)]"
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
              <span
                className={`max-w-[160px] text-xs leading-snug ${
                  active ? "font-semibold text-color-text-main" : done ? "font-medium text-color-primary" : "font-medium text-color-text-muted"
                }`}
              >
                {step}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
