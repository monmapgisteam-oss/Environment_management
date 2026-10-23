'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { HiEye, HiEyeOff, HiLockClosed } from 'react-icons/hi';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/signup';
import { toast } from '@/lib/toast';

const inputClass =
  'h-11 w-full border border-slate-300 bg-white px-3.5 pr-11 text-sm text-slate-800 transition focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/10';

// Shown over every page until a user with an admin-set temporary password
// picks their own. It cannot be closed; signing out is the only other way.
export default function ForcePasswordDialog({ userName, email }: { userName: string; email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const longEnough = password.length >= MIN_PASSWORD_LENGTH;
  const matches = password.length > 0 && password === confirm;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!longEnough) return setError(`Нууц үг ${MIN_PASSWORD_LENGTH}-аас доошгүй тэмдэгттэй байна.`);
    if (!matches) return setError('Шинэ нууц үг давтан оруулсантай таарахгүй байна.');
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password, confirmPassword: confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Нууц үг солиход алдаа гарлаа.');
        setSaving(false);
        return;
      }
      toast('Нууц үг амжилттай солигдлоо.');
      router.refresh();
    } catch {
      setError('Нууц үг солиход алдаа гарлаа.');
      setSaving(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/';
  };

  const rule = (ok: boolean, text: string) => (
    <li className={`flex items-center gap-2 ${ok ? 'text-teal-700' : 'text-slate-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-teal-600' : 'bg-slate-300'}`} />
      {text}
    </li>
  );

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-password-title"
        className="w-full max-w-md bg-white shadow-2xl"
      >
        <div className="border-b border-slate-200 px-6 py-5">
          <span className="flex h-11 w-11 items-center justify-center bg-teal-50 text-teal-700">
            <HiLockClosed size={22} />
          </span>
          <h2 id="force-password-title" className="mt-4 text-lg font-semibold text-slate-900">Шинэ нууц үг тохируулах</h2>
          <p className="mt-1 text-sm text-slate-500">
            Сайн байна уу, {userName}. Таны бүртгэлийг админ үүсгэсэн тул эхний нэвтрэлтээр өөрийн нууц үгээ тохируулна уу.
          </p>
          <p className="mt-2 text-xs text-slate-400">{email}</p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-[13px] font-medium text-slate-700">Шинэ нууц үг</label>
            <div className="relative">
              <input
                id="new-password"
                type={visible ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                autoFocus
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-600"
                aria-label={visible ? 'Нууц үгийг нуух' : 'Нууц үгийг харуулах'}
              >
                {visible ? <HiEyeOff size={18} /> : <HiEye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-[13px] font-medium text-slate-700">Шинэ нууц үг давтах</label>
            <input
              id="confirm-password"
              type={visible ? 'text' : 'password'}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <ul className="space-y-1 text-xs">
            {rule(longEnough, `${MIN_PASSWORD_LENGTH}-аас доошгүй тэмдэгт`)}
            {rule(matches, 'Хоёр удаа ижил оруулсан')}
          </ul>
          {error && <p className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" onClick={logout} className="text-sm font-medium text-slate-500 hover:text-slate-700">
            Гарах
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 bg-[#0F766E] px-5 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:opacity-60"
          >
            {saving ? 'Хадгалж байна...' : 'Нууц үг хадгалах'}
          </button>
        </div>
      </form>
    </div>
  );
}
