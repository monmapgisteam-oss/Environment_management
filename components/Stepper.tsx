interface StepperProps {
  currentStep: number;
  steps: string[];
}

export default function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          {/* Connecting line before (except first) */}
          {index > 0 && (
            <div className={`w-16 h-[2px] ${index <= currentStep ? 'bg-color-primary' : 'bg-[#D9E4F0]'}`} />
          )}
          {/* Step circle + label */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                ${index <= currentStep
                  ? 'bg-color-primary text-white'
                  : 'bg-white border-2 border-[#D9E4F0] text-color-text-muted'
                }`}
            >
              {index + 1}
            </div>
            <span className={`text-[11px] font-medium whitespace-nowrap ${index === currentStep ? 'text-color-primary' : 'text-color-text-muted'}`}>
              {step}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
