'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LuArrowRight } from 'react-icons/lu';
import type { LoginAccount } from '@/lib/constants';

type Props = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  accounts: LoginAccount[];
  allowedRoles: string[];
};

// A landing-page card that lists an organisation's pre-defined accounts and
// logs straight into the chosen one — no email/password typing.
export default function OrgLoginCard({ title, subtitle, icon, accounts, allowedRoles }: Props) {
  const router = useRouter();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loginAs = async (account: LoginAccount) => {
    setLoadingEmail(account.email);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, password: account.password, allowedRoles }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        router.push(data.redirect || '/');
      } else {
        setError(data.error || 'Нэвтрэхэд алдаа гарлаа.');
        setLoadingEmail(null);
      }
    } catch {
      setError('Алдаа гарлаа. Дахин оролдоно уу.');
      setLoadingEmail(null);
    }
  };

  return (
    <div className="relative flex flex-col rounded-[28px] border border-sky-100 bg-gradient-to-b from-white to-sky-50/40 px-8 py-10 text-center shadow-[0_8px_30px_rgba(2,132,199,0.08)]">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-500/25">
        {icon}
      </div>

      <h3 className="mt-6 text-xl font-bold text-[#08264A]">{title}</h3>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        <span className="h-1 w-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
      </div>

      <p className="mt-4 text-sm text-slate-500">{subtitle}</p>

      <div className="mt-6 space-y-3">
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => loginAs(account)}
            disabled={loadingEmail !== null}
            className="group flex w-full items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:from-blue-500 hover:to-cyan-400 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <span>{account.label}</span>
            {loadingEmail === account.email ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <LuArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            )}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-center text-sm font-medium text-red-500">{error}</p>}
    </div>
  );
}
