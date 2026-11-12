'use client';

import { LuLogOut } from 'react-icons/lu';

// Ends the session and returns to the start page.
export default function LogoutButton() {
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/';
  };
  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex h-11 items-center gap-2 border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
    >
      <LuLogOut size={16} />
      <span className="hidden sm:inline">Гарах</span>
    </button>
  );
}
