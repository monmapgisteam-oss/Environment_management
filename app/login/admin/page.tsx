'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@tailan.mn');
  const [password, setPassword] = useState('Admin123!');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, expectedRole: 'admin' }),
    });
    if (response.ok) {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-400 via-cyan-400 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md rounded-[30px] bg-white/95 p-8 shadow-soft">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Системийн админ</p>
          <h1 className="mt-4 text-3xl font-semibold text-navy">Нэвтрэх</h1>
          <p className="mt-2 text-sm text-slate-600">Системийн удирдлагын самбар.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Имэйл</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-sky-100 bg-slate-50 px-4 py-3 text-slate-900 focus:border-primary focus:ring-2 focus:ring-cyan-200"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Нууц үг</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-sky-100 bg-slate-50 px-4 py-3 text-slate-900 focus:border-primary focus:ring-2 focus:ring-cyan-200"
              required
            />
          </label>
          <button className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3f6b]">
            Нэвтрэх
          </button>
        </form>
      </div>
    </div>
  );
}
