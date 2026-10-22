'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { LuArrowLeft, LuArrowRight } from 'react-icons/lu';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/signup';

const inputClass =
  'h-10 w-full border border-slate-300 bg-white px-3.5 text-sm text-slate-800 transition focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/10';
const labelClass = 'mb-1 block text-[13px] font-medium text-slate-700';

function Field({
  label,
  children,
  required,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// Numbered group of fields laid out in two columns.
function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="flex h-5 w-5 items-center justify-center bg-teal-600 text-[11px] font-bold text-white">{number}</span>
        {title}
      </legend>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

// Self-service registration for a sender company: the company, the person
// responsible for its reports, and their login.
export default function SignupForm() {
  const [form, setForm] = useState({
    companyName: '',
    registerNumber: '',
    companyPhone: '',
    contactName: '',
    position: '',
    phone: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.password !== form.passwordConfirm) {
      setError('Нууц үг давтан оруулсантай таарахгүй байна.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        // Full navigation so the new session is picked up fresh.
        window.location.href = data.redirect || '/sender';
      } else {
        setError(data.error || 'Бүртгүүлэхэд алдаа гарлаа.');
        setLoading(false);
      }
    } catch {
      setError('Алдаа гарлаа. Дахин оролдоно уу.');
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Бүртгүүлэх</p>
          <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight text-slate-900">Тайлан илгээх байгууллага</h1>
          <p className="mt-1 text-sm text-slate-500">Байгууллагынхаа мэдээллийг оруулж, нэвтрэх эрх үүсгэнэ.</p>
        </div>
        <Link href="/login/sender" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-teal-700">
          <LuArrowLeft size={15} /> Нэвтрэх
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Section number={1} title="Байгууллага">
          <Field label="Байгууллагын нэр" required className="sm:col-span-2">
            <input value={form.companyName} onChange={set('companyName')} required placeholder="Жишээ ХХК" className={inputClass} />
          </Field>
          <Field label="Регистрийн дугаар" required>
            <input
              value={form.registerNumber}
              onChange={set('registerNumber')}
              required
              inputMode="numeric"
              pattern="\d{7}"
              title="Улсын бүртгэлийн 7 оронтой дугаар"
              placeholder="7 оронтой, ж: 2036479"
              className={inputClass}
            />
          </Field>
          <Field label="Байгууллагын утас">
            <input value={form.companyPhone} onChange={set('companyPhone')} placeholder="7700 0000" className={inputClass} />
          </Field>
        </Section>

        <Section number={2} title="Тайлан хариуцсан ажилтан">
          <Field label="Овог, нэр" required>
            <input value={form.contactName} onChange={set('contactName')} required placeholder="Б. Батбаяр" className={inputClass} />
          </Field>
          <Field label="Албан тушаал">
            <input value={form.position} onChange={set('position')} placeholder="Байгаль орчны мэргэжилтэн" className={inputClass} />
          </Field>
          <Field label="Гар утас">
            <input value={form.phone} onChange={set('phone')} placeholder="9900 0000" className={inputClass} />
          </Field>
        </Section>

        <Section number={3} title="Нэвтрэх мэдээлэл">
          <Field label="Имэйл" required className="sm:col-span-2">
            <input type="email" value={form.email} onChange={set('email')} required placeholder="name@company.mn" className={inputClass} />
          </Field>
          <Field label="Нууц үг" required>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              minLength={MIN_PASSWORD_LENGTH}
              placeholder={`${MIN_PASSWORD_LENGTH}-аас доошгүй тэмдэгт`}
              className={inputClass}
            />
          </Field>
          <Field label="Нууц үг давтах" required>
            <input type="password" value={form.passwordConfirm} onChange={set('passwordConfirm')} required minLength={MIN_PASSWORD_LENGTH} className={inputClass} />
          </Field>
        </Section>

        {error && <p className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="flex flex-col-reverse items-center gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
          <p className="text-sm text-slate-500">
            Бүртгэлтэй юу?{' '}
            <Link href="/login/sender" className="font-semibold text-teal-700 hover:underline">
              Нэвтрэх
            </Link>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#0F766E] px-6 text-sm font-semibold text-white shadow-btn transition-colors hover:bg-[#115E59] disabled:opacity-60 sm:w-auto"
          >
            {loading ? 'Бүртгэж байна...' : 'Бүртгүүлж нэвтрэх'}
            {!loading && <LuArrowRight size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
