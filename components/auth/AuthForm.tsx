'use client';

import { useState } from 'react';
import { LuShieldCheck, LuArrowRight } from 'react-icons/lu';

type Props = {
  title: string;
  subtitle: string;
  allowedRoles: string[];
  // Prefilled so testing is one click; real workers clear these and type
  // their own email/password once accounts are created for them.
  exampleEmail: string;
  examplePassword: string;
};

export default function AuthForm({ title, subtitle, allowedRoles, exampleEmail, examplePassword }: Props) {
  const [email, setEmail] = useState(exampleEmail);
  const [password, setPassword] = useState(examplePassword);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, allowedRoles }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        // Full navigation (not router.push) so the new session's data is fetched
        // fresh — the App Router client cache would otherwise show the previously
        // logged-in user's dashboard.
        window.location.href = data.redirect || '/';
      } else {
        setError(data.error || 'Нэвтрэхэд алдаа гарлаа.');
        setLoading(false);
      }
    } catch {
      setError('Алдаа гарлаа. Дахин оролдоно уу.');
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 py-12">
      {/* Same soft teal/emerald background treatment as the main login page */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-44 -left-36 h-[26rem] w-[26rem] rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute -top-28 right-[-9rem] h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="absolute -bottom-52 -right-36 h-[30rem] w-[30rem] rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[-8rem] h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl" />

        <div className="absolute top-24 left-[22%] h-40 w-40 rounded-full bg-teal-300/10 blur-2xl" />
        <div className="absolute bottom-28 right-[22%] h-44 w-44 rounded-full bg-emerald-300/10 blur-2xl" />

        <div className="absolute left-1/2 top-1/2 h-[42rem] w-[62rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-3xl" />

        <svg className="absolute -left-12 -top-12 h-[24rem] w-[24rem] text-teal-500/[0.18]" viewBox="0 0 220 220" fill="none" aria-hidden="true">
          <path d="M70 0A70 70 0 0 1 0 70" stroke="currentColor" strokeWidth="2" />
          <path d="M120 0A120 120 0 0 1 0 120" stroke="currentColor" strokeWidth="2" />
          <path d="M170 0A170 170 0 0 1 0 170" stroke="currentColor" strokeWidth="2" />
        </svg>
        <svg className="absolute -right-12 -bottom-12 h-[24rem] w-[24rem] text-emerald-500/[0.18]" viewBox="0 0 220 220" fill="none" aria-hidden="true">
          <path d="M150 220A70 70 0 0 1 220 150" stroke="currentColor" strokeWidth="2" />
          <path d="M100 220A120 120 0 0 1 220 100" stroke="currentColor" strokeWidth="2" />
          <path d="M50 220A170 170 0 0 1 220 50" stroke="currentColor" strokeWidth="2" />
        </svg>

        <svg className="absolute right-10 top-14 h-32 w-32 text-teal-600/[0.07]" aria-hidden="true">
          <defs>
            <pattern id="auth-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-dots)" />
        </svg>
        <svg className="absolute left-10 bottom-14 h-32 w-32 text-teal-600/[0.07]" aria-hidden="true">
          <rect width="100%" height="100%" fill="url(#auth-dots)" />
        </svg>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-[28px] border border-slate-200 bg-white/85 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-10">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-teal-600/25">
            <LuShieldCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>

        {/* Email / password login */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Имэйл</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Нууц үг</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {error && <p className="text-center text-sm font-medium text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#115E59] disabled:opacity-60"
          >
            {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
            {!loading && <LuArrowRight size={16} />}
          </button>
        </form>

        {/* Let users who landed on a single-organisation login return to the main
            page, where every organisation (sender, reviewer, admin) is listed. */}
        <div className="mt-6 text-center">
          <a href="/" className="text-sm font-medium text-slate-500 transition-colors hover:text-[#0F766E]">
            ← Бусад байгууллагаар нэвтрэх
          </a>
        </div>
      </div>
    </div>
  );
}
