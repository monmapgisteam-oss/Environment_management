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
    <div className="group/card relative flex flex-col rounded-[20px] border border-slate-200 bg-white px-8 py-10 text-center shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600 ring-1 ring-teal-100">
        {icon}
      </div>

      <h3 className="mt-6 text-xl font-bold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>

      <div className="mt-6 space-y-3">
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => loginAs(account)}
            disabled={loadingEmail !== null}
            className="group flex h-12 w-full items-center justify-between gap-2 rounded-xl bg-[#0F766E] px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#115E59] disabled:opacity-60"
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
