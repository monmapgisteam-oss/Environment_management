'use client';

import { useRef, useState } from 'react';
import { HiOutlineCalendar } from 'react-icons/hi';

type Props = {
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  className?: string;
};

// Date field that always reads ОООО-СС-ӨӨ, whatever the browser's language
// (the native date input shows mm/dd/yyyy in an English browser). Typing
// adds the dashes; the calendar button opens the browser's own picker.
export default function DateInput({ value, onChange, name, id, required, className = '' }: Props) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value;

  const type = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const formatted = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('-');
    setDraft(formatted);
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted) && !Number.isNaN(new Date(formatted).getTime())) {
      onChange(formatted);
      setDraft(null);
    } else if (formatted === '') {
      onChange('');
      setDraft(null);
    }
  };

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        value={shown}
        onChange={(event) => type(event.target.value)}
        onBlur={() => setDraft(null)}
        placeholder="ОООО-СС-ӨӨ"
        required={required}
        pattern="\d{4}-\d{2}-\d{2}"
        title="Огноог ОООО-СС-ӨӨ хэлбэрээр оруулна уу"
        className="h-11 w-full border border-slate-200 bg-white px-3.5 pr-11 text-sm text-slate-700 transition focus:border-color-primary focus:outline-none focus:ring-2 focus:ring-color-primary/10"
      />
      <button
        type="button"
        onClick={openPicker}
        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-teal-700"
        aria-label="Хуанли нээх"
        tabIndex={-1}
      >
        <HiOutlineCalendar size={18} />
      </button>
      {/* Hidden native input that only provides the calendar popup. */}
      <input
        ref={pickerRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
      />
    </div>
  );
}
