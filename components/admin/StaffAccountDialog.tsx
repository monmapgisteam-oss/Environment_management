'use client';

import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { HiRefresh } from 'react-icons/hi';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/signup';

const inputClass =
  'h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-800 transition focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/10';
const labelClass = 'mb-1 block text-[13px] font-medium text-slate-700';

// A random temporary password the admin can hand over; the user replaces it
// at first login anyway.
export function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const values = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

function PasswordField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor="staff-password" className={labelClass}>
        Түр нууц үг <span className="text-rose-500">*</span>
      </label>
      <div className="flex">
        <input
          id="staff-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="off"
          className={`${inputClass} font-mono`}
        />
        <button
          type="button"
          onClick={() => onChange(generatePassword())}
          className="inline-flex shrink-0 items-center gap-1.5 border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50"
        >
          <HiRefresh size={14} /> Үүсгэх
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {MIN_PASSWORD_LENGTH}-аас доошгүй тэмдэгт. Хэрэглэгч анх нэвтрэхдээ өөрийн нууц үгээр солино.
      </p>
    </div>
  );
}

function Shell({ title, description, children, onClose, saving }: { title: string; description: string; children: React.ReactNode; onClose: () => void; saving: boolean }) {
  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div role="dialog" aria-modal="true" className="w-full max-w-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function Actions({ saving, submitLabel, onClose, error }: { saving: boolean; submitLabel: string; onClose: () => void; error: string }) {
  return (
    <>
      {error && <p className="mx-6 mb-4 border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <button type="button" onClick={onClose} disabled={saving} className="h-10 border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          Цуцлах
        </button>
        <button type="submit" disabled={saving} className="h-10 bg-[#0F766E] px-5 text-sm font-semibold text-white hover:bg-[#115E59] disabled:opacity-60">
          {saving ? 'Хадгалж байна...' : submitLabel}
        </button>
      </div>
    </>
  );
}

// New account for the review organisation. Returns the email and temporary
// password so the admin can pass them on.
export function CreateStaffDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (email: string, password: string) => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'evaluator', position: '', phone: '', password: generatePassword() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Бүртгэл үүсгэхэд алдаа гарлаа.');
        setSaving(false);
        return;
      }
      onCreated(form.email.trim().toLowerCase(), form.password);
    } catch {
      setError('Бүртгэл үүсгэхэд алдаа гарлаа.');
      setSaving(false);
    }
  };

  return (
    <Shell title="Ажилтны эрх үүсгэх" description="Хянах байгууллагын ажилтан эсвэл менежерийн нэвтрэх эрх." onClose={onClose} saving={saving}>
      <form onSubmit={submit}>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Овог, нэр <span className="text-rose-500">*</span></label>
            <input value={form.name} onChange={set('name')} required autoFocus className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Имэйл <span className="text-rose-500">*</span></label>
            <input type="email" value={form.email} onChange={set('email')} required placeholder="name@company.mn" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Эрх <span className="text-rose-500">*</span></label>
            <select value={form.role} onChange={set('role')} className={inputClass}>
              <option value="evaluator">Ажилтан (үнэлгээний гишүүн)</option>
              <option value="review_manager">Хянах менежер</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Утас</label>
            <input value={form.phone} onChange={set('phone')} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Албан тушаал</label>
            <input value={form.position} onChange={set('position')} placeholder="Үнэлгээний гишүүн" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <PasswordField value={form.password} onChange={(password) => setForm((current) => ({ ...current, password }))} />
          </div>
        </div>
        <Actions saving={saving} submitLabel="Эрх үүсгэх" onClose={onClose} error={error} />
      </form>
    </Shell>
  );
}

export function ResetPasswordDialog({ user, onClose, onDone }: { user: { id: string; name: string; email: string }; onClose: () => void; onDone: (password: string) => void }) {
  const [password, setPassword] = useState(generatePassword);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Хадгалахад алдаа гарлаа.');
        setSaving(false);
        return;
      }
      onDone(password);
    } catch {
      setError('Хадгалахад алдаа гарлаа.');
      setSaving(false);
    }
  };

  return (
    <Shell title="Нууц үг шинэчлэх" description={`${user.name} (${user.email}) дараагийн нэвтрэлтээрээ шинэ нууц үг тохируулна.`} onClose={onClose} saving={saving}>
      <form onSubmit={submit}>
        <div className="px-6 py-5">
          <PasswordField value={password} onChange={setPassword} />
        </div>
        <Actions saving={saving} submitLabel="Хадгалах" onClose={onClose} error={error} />
      </form>
    </Shell>
  );
}

// After creating or resetting: the credentials to hand over, shown once.
export function CredentialsDialog({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Имэйл: ${email}\nТүр нууц үг: ${password}`);
      setCopied(true);
    } catch {
      // The values stay on screen to copy by hand.
    }
  };
  return (
    <Shell title="Нэвтрэх мэдээлэл" description="Энэ мэдээллийг хэрэглэгчид дамжуулна уу. Нууц үг дахин харагдахгүй." onClose={onClose} saving={false}>
      <div className="space-y-2 px-6 py-5 font-mono text-sm">
        <p><span className="text-slate-500">Имэйл:</span> <span className="font-semibold text-slate-900">{email}</span></p>
        <p><span className="text-slate-500">Түр нууц үг:</span> <span className="font-semibold text-slate-900">{password}</span></p>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <button type="button" onClick={copy} className="h-10 border border-teal-600 bg-white px-4 text-sm font-semibold text-teal-700 hover:bg-teal-50">
          {copied ? 'Хуулсан' : 'Хуулах'}
        </button>
        <button type="button" onClick={onClose} className="h-10 bg-[#0F766E] px-5 text-sm font-semibold text-white hover:bg-[#115E59]">
          Болсон
        </button>
      </div>
    </Shell>
  );
}
