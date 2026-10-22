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

// Bottom-right stack of short-lived messages raised with toast().
export default function Toaster() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const item = (event as CustomEvent<ToastMessage>).detail;
      setItems((current) => [...current, item]);
      window.setTimeout(() => setItems((current) => current.filter((t) => t.id !== item.id)), DURATION_MS);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 border border-slate-200 bg-white py-3 pl-3 pr-2 shadow-card"
        >
          <span className={`w-1 self-stretch ${STYLE[item.kind].bar}`} />
          {STYLE[item.kind].icon}
          <p className="flex-1 text-sm text-slate-800">{item.message}</p>
          <button
            type="button"
            onClick={() => setItems((current) => current.filter((t) => t.id !== item.id))}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Хаах"
          >
            <HiX size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
