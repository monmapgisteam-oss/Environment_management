'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { HiDotsHorizontal } from 'react-icons/hi';

export type RowMenuItem = { label: string; href: string };

// "More" menu for a table row: the actions that are not the row's main one.
export default function RowActions({ items, label }: { items: RowMenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (items.length === 0) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-9 items-center justify-center border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
        aria-label={`${label}: бусад үйлдэл`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <HiDotsHorizontal size={18} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-48 border border-slate-200 bg-white py-1 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-800"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
