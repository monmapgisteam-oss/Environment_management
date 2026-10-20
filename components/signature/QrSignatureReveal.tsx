'use client';

import { useState } from 'react';
import { HiEye, HiEyeOff, HiSparkles } from 'react-icons/hi';

type Props = {
  signature: string | null;
};

export default function QrSignatureReveal({ signature }: Props) {
  const [visible, setVisible] = useState(false);
  const hasSignature = Boolean(signature);

  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <HiSparkles className="mt-0.5 shrink-0 text-[#0F766E]" size={20} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Тоон гарын үсэг</p>
        <p className="mt-1 break-words font-mono text-lg font-bold tracking-[0.18em] text-slate-900">
          {hasSignature ? (visible ? signature : '****') : 'Бүртгэгдээгүй'}
        </p>
      </div>
      {hasSignature && (
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Тоон гарын үсэг нуух' : 'Тоон гарын үсэг харах'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100"
        >
          {visible ? <HiEyeOff size={20} /> : <HiEye size={20} />}
        </button>
      )}
    </div>
  );
}
