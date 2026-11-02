'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { HiKey, HiX } from 'react-icons/hi';

type SummaryRow = { label: string; value: ReactNode };

type Props = {
  title: string;
  // What the person is about to sign, shown above the PIN field.
  summary: SummaryRow[];
  note?: string;
  confirmLabel: string;
  // Sends the PIN. Resolves to an error message to show, or null when signed.
  onSign: (pin: string) => Promise<string | null>;
  onClose: () => void;
};

// The one place a digital signature is entered: an evaluator signing their
// scores and the manager approving them both go through this dialog.
export default function SignaturePinDialog({ title, summary, note, confirmLabel, onSign, onClose }: Props) {
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
      const message = await onSign(pin);
      if (message) {
        setError(message);
        setPin('');
      }
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
        aria-labelledby="signature-dialog-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-teal-50 text-teal-700">
            <HiKey size={20} />
          </span>
          <h3 id="signature-dialog-title" className="min-w-0 flex-1 pt-2 text-base font-semibold text-slate-900">
            {title}
          </h3>
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

        <dl className="mt-4 divide-y divide-slate-100 border border-slate-200 bg-slate-50 text-sm">
          {summary.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-3 py-2">
              <dt className="text-slate-500">{row.label}</dt>
              <dd className="text-right font-semibold text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>
        {note && <p className="mt-3 text-xs leading-5 text-slate-500">{note}</p>}

        <label htmlFor="signature-pin" className="mt-5 block text-xs font-medium text-slate-700">
          Тоон гарын үсгийн нууц үг
        </label>
        <input
          id="signature-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={12}
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
          placeholder="••••••"
          className="mt-1.5 h-11 w-full border border-slate-200 bg-white px-3 text-center text-lg tracking-[0.5em] text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Системээс олгосон тоон нууц үг. Мартсан бол админд хандана уу.
        </p>
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
            {saving ? 'Шалгаж байна...' : confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
