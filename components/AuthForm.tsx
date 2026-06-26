'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuShieldCheck, LuUser, LuLock, LuEye, LuEyeOff, LuArrowRight } from 'react-icons/lu';

type Props = {
  title: string;
  subtitle: string;
  defaultEmail?: string;
  defaultPassword?: string;
  allowedRoles: string[];
};

export default function AuthForm({
  title,
  subtitle,
  defaultEmail = '',
  defaultPassword = '',
  allowedRoles,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, allowedRoles }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        // Route by the role the API resolved (manager and staff share a portal).
        router.push(data.redirect || '/');
      } else {
        setError(data.error || 'Имэйл эсвэл нууц үг буруу байна.');
      }
    } catch {
      setError('Алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setSubmitting(false);
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#08264A]">Имэйл</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <LuUser size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#08264A]">Нууц үг</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <LuLock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label={showPassword ? 'Нууц үг нуух' : 'Нууц үг харах'}
              >
                {showPassword ? <LuEye size={18} /> : <LuEyeOff size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:from-blue-500 hover:to-cyan-400 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                Нэвтрэх
                <LuArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
