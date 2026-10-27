'use client';

import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { HiKey, HiX } from 'react-icons/hi';
import { toast } from '@/lib/toast';
import { formatScore } from '@/lib/utils';

type Props = {
  reportId: string;
  evaluatorCount: number;
  finalScore: number | null;
  onClose: () => void;
};

// Second signature step: the manager checks the evaluators' signed scores and
// signs them off with their own digital signature password, which releases
// the scores to the sender (api/reports/[id]/approve-scores).
export default function ApproveScoresDialog({ reportId, evaluatorCount, finalScore, onClose }: Props) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      toast('Үнэлгээг гарын үсгээр баталгаажууллаа. Илгээгч байгууллагад дүн харагдана.');
      onClose();
      router.refresh();
    } catch {
      setError('Сүлжээний алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4" onClick={() => !saving && onClose()}>
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-teal-50 text-teal-700">
            <HiKey size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-900">Гарын үсгээр баталгаажуулах</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {evaluatorCount} гишүүн бүгд гарын үсгээр үнэлсэн. Дундаж оноо:{' '}
              <span className="font-semibold text-slate-800">{formatScore(finalScore)}</span>. Баталгаажуулсны дараа илгээгч
              байгууллагад дүн харагдана.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Хаах"
            className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <HiX size={18} />
          </button>
        </div>

        <label htmlFor="approval-pin" className="mt-5 block text-xs font-medium text-slate-700">
          Тоон гарын үсгийн нууц үг
        </label>
        <input
          id="approval-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
          placeholder="••••••"
          className="mt-1.5 h-11 w-full border border-slate-200 bg-white px-3 text-sm tracking-widest text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
        />
        {error && <p className="mt-2 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Болих
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 bg-[#0F766E] px-5 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:opacity-60"
          >
            {saving ? 'Шалгаж байна...' : 'Гарын үсэг зурж баталгаажуулах'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
