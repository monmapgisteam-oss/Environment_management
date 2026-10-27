'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { HiBadgeCheck, HiKey } from 'react-icons/hi';
import { toast } from '@/lib/toast';
import { formatScore } from '@/lib/utils';
import type { ScoreApproval } from './types';

type Props = {
  reportId: string;
  approval: ScoreApproval | null;
  // Manager only, once every evaluator has signed and nobody approved yet.
  canApprove: boolean;
  evaluatorCount: number;
  finalScore: number | null;
};

// Second signature step: the manager checks the evaluators' signed scores and
// signs them off with their own digital signature password, which releases
// the scores to the sender. Afterwards everyone sees who approved and when.
export default function ScoreApprovalCard({ reportId, approval, canApprove, evaluatorCount, finalScore }: Props) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (approval) {
    return (
      <div className="border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <HiBadgeCheck size={22} className="mt-0.5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-emerald-900">Менежер баталгаажуулсан</h2>
            <p className="mt-1 text-sm font-medium text-slate-900">{approval.name}</p>
            {approval.position && <p className="text-xs text-slate-600">{approval.position}</p>}
            <p className="mt-2 text-xs text-slate-600">
              {new Date(approval.approvedAt).toLocaleString('mn-MN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            {approval.signatureId && (
              <p className="mt-0.5 font-mono text-[11px] text-emerald-800">{approval.signatureId}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!canApprove) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!pin) {
      setError('Гарын үсгийн нууц үгээ оруулна уу.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/${reportId}/approve-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Баталгаажуулахад алдаа гарлаа.');
        return;
      }
      setPin('');
      toast('Үнэлгээг баталгаажууллаа. Илгээгч байгууллагад дүн харагдана.');
      router.refresh();
    } catch {
      setError('Сүлжээний алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-teal-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-teal-50 text-teal-700">
          <HiKey size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Үнэлгээг баталгаажуулах</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {evaluatorCount} гишүүн бүгд гарын үсгээр үнэлсэн. Дундаж оноо:{' '}
            <span className="font-semibold text-slate-800">{formatScore(finalScore)}</span>. Оноог шалгаад тоон гарын
            үсгээр баталгаажуулсны дараа илгээгчид дүн харагдана.
          </p>
        </div>
      </div>

      <label htmlFor="approval-pin" className="mt-4 block text-xs font-medium text-slate-700">
        Тоон гарын үсгийн нууц үг
      </label>
      <input
        id="approval-pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
        placeholder="••••••"
        className="mt-1.5 h-10 w-full border border-slate-200 bg-white px-3 text-sm tracking-widest text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
      />
      {error && <p className="mt-2 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-3 h-10 w-full bg-[#0F766E] text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:opacity-60"
      >
        {saving ? 'Шалгаж байна...' : 'Гарын үсэг зурж баталгаажуулах'}
      </button>
    </form>
  );
}
