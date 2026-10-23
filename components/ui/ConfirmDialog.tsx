'use client';

import { useEffect, useRef, useState } from 'react';
import { HiExclamation, HiQuestionMarkCircle } from 'react-icons/hi';
import { CONFIRM_EVENT, type ConfirmRequest } from '@/lib/confirm';

// Modal raised with confirmDialog(). One question at a time; a new request
// while one is open answers the open one with "no".
export default function ConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onConfirm = (event: Event) => {
      const next = (event as CustomEvent<ConfirmRequest>).detail;
      setRequest((current) => {
        current?.resolve(false);
        return next;
      });
    };
    window.addEventListener(CONFIRM_EVENT, onConfirm);
    return () => window.removeEventListener(CONFIRM_EVENT, onConfirm);
  }, []);

  const answer = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  useEffect(() => {
    if (!request) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [request]);

  if (!request) return null;
  const danger = request.danger ?? false;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" onClick={() => answer(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-md bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              danger ? 'bg-rose-50 text-rose-500' : 'bg-teal-50 text-teal-600'
            }`}
          >
            {danger ? <HiExclamation size={22} /> : <HiQuestionMarkCircle size={22} />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
              {request.title ?? 'Баталгаажуулах'}
            </h3>
            <p id="confirm-dialog-message" className="mt-1 text-sm text-slate-600">
              {request.message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => answer(false)}
            className="flex-1 border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {request.cancelLabel ?? 'Цуцлах'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => answer(true)}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white transition ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-color-primary hover:opacity-90'
            }`}
          >
            {request.confirmLabel ?? 'Тийм'}
          </button>
        </div>
      </div>
    </div>
  );
}
