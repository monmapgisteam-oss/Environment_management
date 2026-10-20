type Props = {
  reason: string;
};

// Tells the sender why the manager returned the report for revision.
export default function RevisionNotice({ reason }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-orange-200 p-6">
      <p className="text-sm font-semibold text-orange-700">Тайлан засвар шаардсан байна</p>
      <p className="mt-1 text-sm text-slate-700">Шалтгаан: {reason}</p>
    </div>
  );
}
