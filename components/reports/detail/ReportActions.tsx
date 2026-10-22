type Props = {
  reportId: string;
  isConclusion: boolean;
  isReviewer: boolean;
  isStaff: boolean;
  canFix: boolean;
};

// Back link to the viewer's list, plus a "fix" link when the sender must revise the report.
export default function ReportActions({ reportId, isConclusion, isReviewer, isStaff, canFix }: Props) {
  const backHref = isConclusion
    ? isReviewer
      ? '/reviewer/conclusions'
      : isStaff
        ? '/evaluator/conclusions'
        : '/sender/reports'
    : isReviewer
      ? '/reviewer'
      : isStaff
        ? '/evaluator'
        : '/sender';

  return (
    <div className="flex flex-col gap-2">
      {canFix && (
        <a href={`/sender/submit?edit=${reportId}`} className="inline-flex h-10 items-center justify-center bg-amber-500 px-5 text-sm font-semibold text-white transition hover:bg-amber-600">
          Засаад дахин илгээх
        </a>
      )}
      <a href={backHref} className="inline-flex h-10 items-center justify-center border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
        Буцах
      </a>
    </div>
  );
}
