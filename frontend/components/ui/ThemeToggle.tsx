'use client';

import { useEffect, useState } from 'react';
import { LuMoon, LuSun } from 'react-icons/lu';
import { THEME_STORAGE_KEY } from '@/lib/theme/themeScript';

// Switches between light and dark. The choice is saved in this browser; with no
// saved choice the page follows the system setting (see lib/theme/themeScript.ts,
// which applies it before the first paint).
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // Storage blocked: the theme still changes for this page view.
    }
    setDark(next);
  };

  const label = dark ? 'Цайвар горим' : 'Бараан горим';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`flex h-11 w-11 items-center justify-center border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 ${className}`}
    >
      {/* Icon waits for the mount so server and client markup match. */}
      {dark === null ? null : dark ? <LuSun size={18} /> : <LuMoon size={18} />}
    </button>
  );
}
