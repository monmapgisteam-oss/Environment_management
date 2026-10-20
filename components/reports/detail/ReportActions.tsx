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
    <div className="flex justify-end gap-3">
      {canFix && (
        <a href={`/sender/submit?edit=${reportId}`} className="h-10 px-5 rounded-xl border border-orange-300 bg-orange-50 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition inline-flex items-center">
          Засах
        </a>
      )}
      <a href={backHref} className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition inline-flex items-center">
        Буцах
      </a>
    </div>
  );
}
