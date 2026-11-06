'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HiBadgeCheck, HiKey } from 'react-icons/hi';
import ApproveScoresDialog from './ApproveScoresDialog';
import type { ScoreApproval } from './types';

type Props = {
  approval: ScoreApproval | null;
  // Own scoring is independent; approval waits for all assigned members.
  pending?: { reportId: string; reportNumber: string; evaluatorCount: number; signedEvaluatorCount: number; finalScore: number | null; ownEvaluationSigned: boolean; canApprove: boolean } | null;
};

// The manager's approval of the scores, in the report sidebar: the approve
// action while it waits, then who approved it and when.
export default function ScoreApprovalCard({ approval, pending }: Props) {
  const [open, setOpen] = useState(false);

  if (approval) {
    return (
      <div className="border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <HiBadgeCheck size={22} className="mt-0.5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-emerald-900">Үнэлгээг менежер баталсан</h2>
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

  if (!pending) return null;
  const membersDone = pending.evaluatorCount > 0 && pending.signedEvaluatorCount === pending.evaluatorCount;
  const readyToApprove = pending.canApprove && pending.ownEvaluationSigned && membersDone;
  return (
    <div className="border border-teal-200 bg-teal-50/60 p-5">
      <h2 className="text-sm font-semibold text-teal-900">{readyToApprove ? 'Үнэлгээ батлахыг хүлээж байна' : pending.ownEvaluationSigned ? 'Таны үнэлгээ баталгаажсан' : 'Менежерийн үнэлгээ'}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {readyToApprove
          ? 'Бүх гишүүн болон таны үнэлгээ гарын үсгээр баталгаажсан. Эцсийн дүнг баталсны дараа илгээгчид харагдана.'
          : pending.ownEvaluationSigned
            ? 'Гишүүдийн үнэлгээ дууссаны дараа эцсийн дүнг батална уу.'
            : 'Гишүүдийн үнэлгээг хүлээлгүй өөрийн оноо, үндэслэлээ оруулж, тоон гарын үсгээр баталгаажуулж болно.'}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {pending.evaluatorCount > 0 ? `${pending.signedEvaluatorCount} / ${pending.evaluatorCount} гишүүн гарын үсгээр үнэлсэн` : 'Гишүүдэд хараахан оноогоогүй байна.'}
      </p>
      {readyToApprove ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 bg-[#0F766E] px-4 text-sm font-semibold text-white transition hover:bg-[#115E59]"
        >
          <HiKey size={16} />
          Үнэлгээг батлах
        </button>
      ) : (
        <Link href={`/reviewer/evaluate/${pending.reportId}`} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#115E59]">
          {pending.ownEvaluationSigned ? 'Өөрийн үнэлгээ харах' : 'Өөрийн үнэлгээ өгөх'}
        </Link>
      )}
      {open && readyToApprove && (
        <ApproveScoresDialog
          reportId={pending.reportId}
          reportNumber={pending.reportNumber}
          evaluatorCount={pending.evaluatorCount}
          finalScore={pending.finalScore}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
