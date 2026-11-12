'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiX } from 'react-icons/hi';
import { TOAST_EVENT, type ToastMessage } from '@/lib/toast';

const DURATION_MS = 4500;

const STYLE: Record<ToastMessage['kind'], { bar: string; icon: ReactNode }> = {
  success: { bar: 'bg-teal-600', icon: <HiCheckCircle size={20} className="text-teal-600" /> },
  error: { bar: 'bg-rose-500', icon: <HiExclamationCircle size={20} className="text-rose-500" /> },
  info: { bar: 'bg-slate-500', icon: <HiInformationCircle size={20} className="text-slate-500" /> },
};

// Bottom-right stack of short-lived messages raised with toast(). A toast with
// an action (undo) stays longer and shows a shrinking bar for the time left.
export default function Toaster() {
  const [items, setItems] = useState<ToastMessage[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  const dismiss = (id: number) => setItems((current) => current.filter((t) => t.id !== id));

  useEffect(() => {
    const onToast = (event: Event) => {
      const item = (event as CustomEvent<ToastMessage>).detail;
      setItems((current) => [...current, item]);
      window.setTimeout(() => dismiss(item.id), item.durationMs ?? DURATION_MS);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  const runAction = async (item: ToastMessage) => {
    if (!item.action || busy !== null) return;
    setBusy(item.id);
    try {
      await item.action.onClick();
    } finally {
      setBusy(null);
      dismiss(item.id);
    }
  };

  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className="pointer-events-auto relative overflow-hidden border border-slate-200 bg-white shadow-card"
        >
          <div className="flex items-start gap-3 py-3 pl-3 pr-2">
            <span className={`w-1 self-stretch ${STYLE[item.kind].bar}`} />
            {STYLE[item.kind].icon}
            <p className="flex-1 text-sm text-slate-800">{item.message}</p>
            {item.action && (
              <button
                type="button"
                onClick={() => runAction(item)}
                disabled={busy !== null}
                className="shrink-0 border border-teal-600 px-2.5 py-1 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
              >
                {busy === item.id ? 'Буцааж байна...' : item.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Хаах"
            >
              <HiX size={16} />
            </button>
          </div>
          {item.action && (
            <span
              aria-hidden="true"
              className="toast-countdown absolute bottom-0 left-0 h-0.5 w-full origin-left bg-teal-600/60"
              style={{ animationDuration: `${item.durationMs ?? DURATION_MS}ms` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
