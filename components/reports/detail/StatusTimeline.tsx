import { HiCheck, HiOutlineReply, HiOutlineX } from 'react-icons/hi';
import { formatDate } from '@/lib/utils';

type Props = {
  status: string;
  submittedAt: Date | null;
  assignedCount: number;
  scoredCount: number;
  signedScanAt: Date | null;
  // Senders see the outcome only once the manager has sent the signed scan.
  isSenderView: boolean;
};

type Step = { label: string; detail?: string; state: 'done' | 'current' | 'todo' };

// Where the report is in the review flow: sent → assigned → scored → concluded.
// Returned and rejected reports show that outcome as the last step instead.
export default function StatusTimeline({ status, submittedAt, assignedCount, scoredCount, signedScanAt, isSenderView }: Props) {
  const concluded = ['completed', 'approved'].includes(status) && (!isSenderView || !!signedScanAt);
  const scored = concluded || (assignedCount > 0 && scoredCount >= assignedCount) || status === 'in_review';
  const assigned = scored || assignedCount > 0 || ['assigned', 'in_review'].includes(status);
  const returned = status === 'needs_revision';
  const rejected = status === 'rejected';

  const state = (done: boolean, current: boolean): Step['state'] => (done ? 'done' : current ? 'current' : 'todo');
  const steps: Step[] = [
    { label: 'Илгээсэн', detail: submittedAt ? formatDate(submittedAt) : undefined, state: 'done' },
    {
      label: 'Гишүүдэд оноосон',
      detail: assignedCount ? `${assignedCount} гишүүн` : 'Хүлээгдэж байна',
      state: state(assigned, !assigned),
    },
    {
      label: 'Үнэлгээ',
      detail: assignedCount ? `${scoredCount} / ${assignedCount} гишүүн үнэлсэн` : undefined,
      state: state(scored, assigned && !scored),
    },
  ];
  if (returned) {
    steps.push({ label: 'Засварлуулахаар буцаасан', detail: 'Засаад дахин илгээнэ үү', state: 'current' });
  } else if (rejected) {
    steps.push({ label: 'Татгалзсан', state: 'current' });
  } else {
    steps.push({
      label: 'Дүгнэлт гарсан',
      detail: concluded ? (signedScanAt ? formatDate(signedScanAt) : undefined) : 'Хүлээгдэж байна',
      state: state(concluded, scored && !concluded),
    });
  }

  return (
    <div className="border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Явц</h2>
      <ol className="mt-4 space-y-0">
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          const outcome = last && (returned || rejected);
          const dot =
            step.state === 'done'
              ? 'bg-teal-600 text-white'
              : step.state === 'current'
                ? outcome
                  ? returned
                    ? 'bg-amber-500 text-white'
                    : 'bg-rose-500 text-white'
                  : 'border-2 border-teal-600 bg-white text-teal-600'
                : 'border-2 border-slate-200 bg-white text-slate-300';
          return (
            <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
              {!last && (
                <span
                  className={`absolute left-[11px] top-6 h-[calc(100%-0.75rem)] w-0.5 ${step.state === 'done' ? 'bg-teal-600' : 'bg-slate-200'}`}
                />
              )}
              <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold ${dot}`}>
                {step.state === 'done' ? <HiCheck size={14} /> : outcome ? (returned ? <HiOutlineReply size={13} /> : <HiOutlineX size={13} />) : index + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-sm font-medium ${step.state === 'todo' ? 'text-slate-400' : 'text-slate-900'}`}>{step.label}</p>
                {step.detail && <p className="mt-0.5 text-xs text-slate-500">{step.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
