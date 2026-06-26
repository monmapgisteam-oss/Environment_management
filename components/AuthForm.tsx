'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuShieldCheck, LuArrowRight } from 'react-icons/lu';

type Account = {
  label: string;
  email: string;
  password: string;
};

type Props = {
  title: string;
  subtitle: string;
  accounts: Account[];
  allowedRoles: string[];
};

export default function AuthForm({ title, subtitle, accounts, allowedRoles }: Props) {
  const router = useRouter();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState('');

  // One-click login: no typing — submit the account's known credentials and
  // route by the role the API resolves.
  const loginAs = async (account: Account) => {
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-700 px-4 py-12">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-sky-400/25 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        <svg className="absolute right-16 top-16 h-40 w-40 text-white/25" aria-hidden="true">
          <defs>
            <pattern id="auth-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="2" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-dots)" />
        </svg>
        <svg className="absolute bottom-16 left-12 h-40 w-40 text-white/20" aria-hidden="true">
          <rect width="100%" height="100%" fill="url(#auth-dots)" />
        </svg>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-[32px] border border-white/60 bg-white/90 p-8 shadow-[0_30px_80px_rgba(8,38,74,0.25)] backdrop-blur-xl sm:p-10">
        {/* Header */}
        <div className="text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-500/30">
              <LuShieldCheck size={28} />
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#08264A] sm:text-[26px]">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>

        {/* One-click login buttons */}
        <div className="mt-8 space-y-3">
          {accounts.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => loginAs(account)}
              disabled={loadingEmail !== null}
              className="group flex w-full items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:from-blue-500 hover:to-cyan-400 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <span>{account.label}</span>
              {loadingEmail === account.email ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <LuArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              )}
            </button>
          ))}

          {error && <p className="text-center text-sm font-medium text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
