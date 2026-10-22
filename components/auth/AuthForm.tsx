'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LuArrowLeft, LuArrowRight } from 'react-icons/lu';
import AuthLayout from '@/components/auth/AuthLayout';

type Props = {
  title: string;
  subtitle: string;
  allowedRoles: string[];
  // Prefilled so testing is one click; real workers clear these and type
  // their own email/password once accounts are created for them.
  exampleEmail: string;
  examplePassword: string;
  // Shown under the form when the organisation can register itself.
  signupHref?: string;
};

export default function AuthForm({ title, subtitle, allowedRoles, exampleEmail, examplePassword, signupHref }: Props) {
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
    <AuthLayout>
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-teal-700">
          <LuArrowLeft size={15} /> Бусад байгууллагаар нэвтрэх
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-teal-700">Нэвтрэх</p>
        <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>

        {/* Email / password login */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Имэйл</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 w-full border border-slate-300 bg-white px-3.5 text-sm text-slate-800 transition focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Нууц үг</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 w-full border border-slate-300 bg-white px-4 text-sm text-slate-800 transition focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/10"
            />
          </div>

          {error && <p className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 bg-[#0F766E] px-5 text-sm font-semibold text-white shadow-btn transition-colors duration-200 hover:bg-[#115E59] disabled:opacity-60"
          >
            {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
            {!loading && <LuArrowRight size={16} />}
          </button>
        </form>

        {signupHref && (
          <p className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-500">
            Байгууллага бүртгэлгүй юу?{' '}
            <Link href={signupHref} className="font-semibold text-teal-700 hover:underline">
              Бүртгүүлэх
            </Link>
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
