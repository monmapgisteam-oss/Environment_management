import { HiBadgeCheck } from 'react-icons/hi';
import type { ScoreApproval } from './types';

// Who signed the evaluators' scores off, and when. The signing itself starts
// from "Гарын үсгээр баталгаажуулах" on the score table (ApproveScoresDialog).
export default function ScoreApprovalCard({ approval }: { approval: ScoreApproval | null }) {
  if (!approval) return null;
  return (
    <div className="border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-start gap-3">
        <HiBadgeCheck size={22} className="mt-0.5 shrink-0 text-emerald-600" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-emerald-900">Менежер гарын үсгээр баталгаажуулсан</h2>
          <p className="mt-1 text-sm font-medium text-slate-900">{approval.name}</p>
          {approval.position && <p className="text-xs text-slate-600">{approval.position}</p>}
          <p className="mt-2 text-xs text-slate-600">
            {new Date(approval.approvedAt).toLocaleString('mn-MN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          {approval.signatureId && <p className="mt-0.5 font-mono text-[11px] text-emerald-800">{approval.signatureId}</p>}
        </div>
      </div>
    </div>
  );
}
