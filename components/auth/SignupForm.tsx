'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { LuArrowLeft, LuArrowRight, LuCheck, LuFileText, LuUpload } from 'react-icons/lu';
import { CONCLUSION_MAX_FILE_BYTES, MIN_PASSWORD_LENGTH, conclusionFileError } from '@/lib/auth/signup';
import { CONCLUSION_DISTRICTS, CONCLUSION_PROJECT_CATEGORIES, CONCLUSION_TYPES } from '@/lib/reports/conclusions';

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

const PHASES = [
  { title: 'Байгууллагын мэдээлэл', detail: 'Байгууллага, ажилтан, нэвтрэх эрх' },
  { title: 'Ерөнхий үнэлгээний дүгнэлт', detail: 'Дүгнэлтийн PDF, төслийн мэдээлэл' },
];

// Stepper above the form: round markers joined by a line, so it reads as
// progress and not as one more numbered section of fields.
function PhaseIndicator({ phase }: { phase: number }) {
  return (
    <div className="mt-6 border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
      <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <span>Бүртгэлийн алхам</span>
        <span className="text-teal-700">
          {phase + 1} / {PHASES.length}
        </span>
      </div>
      <ol className="flex items-start">
        {PHASES.map(({ title, detail }, index) => {
          const done = index < phase;
          const active = index === phase;
          return (
            <li key={title} className={`flex items-start gap-3 ${index < PHASES.length - 1 ? 'flex-1' : ''}`}>
              <span
                aria-current={active ? 'step' : undefined}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  done
                    ? 'bg-teal-600 text-white'
                    : active
                      ? 'bg-white text-teal-700 ring-2 ring-teal-600 shadow-[0_0_0_4px_rgba(13,148,136,0.12)]'
                      : 'bg-white text-slate-400 ring-1 ring-slate-300'
                }`}
              >
                {done ? <LuCheck size={16} /> : index + 1}
              </span>
              <span className="min-w-0 pt-0.5">
                <span className={`block text-sm font-semibold leading-tight ${active || done ? 'text-slate-900' : 'text-slate-400'}`}>
                  {title}
                </span>
                <span className="mt-0.5 hidden text-xs text-slate-500 sm:block">{detail}</span>
              </span>
              {index < PHASES.length - 1 && (
                <span aria-hidden="true" className={`mx-3 mt-[18px] h-0.5 min-w-6 flex-1 ${done ? 'bg-teal-600' : 'bg-slate-300'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Self-service registration for a sender company in two phases: first the
// company, the person responsible for its reports and their login; then the
// company's general evaluation conclusion (PDF and its details), which the
// review organisation filters conclusions by.
export default function SignupForm() {
  const [phase, setPhase] = useState(0);
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
    conclusionYear: '',
    conclusionNumber: '',
    projectCategory: '',
    projectName: '',
    district: '',
    implementerName: '',
    conclusionType: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set =
    (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  const goToPhase = (next: number) => {
    setPhase(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!picked) return;
    const fileError = conclusionFileError(picked);
    setError(fileError ?? '');
    setFile(fileError ? null : picked);
  };

  // Phase 1 only checks the account fields (and that the email and register
  // number are free); nothing is created until phase 2 is sent.
  const checkAccount = async () => {
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
        // The company itself is the usual implementer; the sender can change it.
        setForm((current) => ({ ...current, implementerName: current.implementerName || current.companyName }));
        goToPhase(1);
      } else {
        setError(data.error || 'Бүртгүүлэхэд алдаа гарлаа.');
      }
    } catch {
      setError('Алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    const fileError = conclusionFileError(file);
    if (fileError) {
      setError(fileError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) body.append(key, value);
      body.append('file', file as File);
      const response = await fetch('/api/auth/signup', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        // Full navigation so the new session is picked up fresh.
        window.location.href = data.redirect || '/sender';
        return;
      }
      setError(data.error || 'Бүртгүүлэхэд алдаа гарлаа.');
      if (data.step === 1) goToPhase(0);
    } catch {
      setError('Алдаа гарлаа. Дахин оролдоно уу.');
    }
    setLoading(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (phase === 0) checkAccount();
    else register();
  };

  const currentYear = new Date().getFullYear();

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Бүртгүүлэх</p>
          <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight text-slate-900">Тайлан илгээх байгууллага</h1>
          <p className="mt-1 text-sm text-slate-500">
            {phase === 0
              ? 'Байгууллагынхаа мэдээллийг оруулж, нэвтрэх эрх үүсгэнэ.'
              : 'Төслийн ерөнхий үнэлгээний дүгнэлтийг хавсаргаж, мэдээллийг бөглөнө.'}
          </p>
        </div>
        <Link href="/login/sender" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-teal-700">
          <LuArrowLeft size={15} /> Нэвтрэх
        </Link>
      </div>

      <PhaseIndicator phase={phase} />

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {phase === 0 ? (
          <>
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
          </>
        ) : (
          <>
            <fieldset>
              <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                Ерөнхий үнэлгээний дүгнэлт <span className="text-rose-500">*</span>
              </legend>
              <label
                htmlFor="conclusion-file"
                className={`flex cursor-pointer items-center gap-3 border border-dashed px-4 py-4 transition ${
                  file ? 'border-teal-600 bg-teal-50/60' : 'border-slate-300 bg-slate-50 hover:border-teal-600 hover:bg-teal-50/40'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center ${file ? 'bg-teal-600 text-white' : 'bg-white text-teal-700 ring-1 ring-slate-200'}`}>
                  {file ? <LuFileText size={18} /> : <LuUpload size={18} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {file ? file.name : 'Ерөнхий үнэлгээний дүгнэлт.pdf файлаа сонгоно уу'}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB · солих бол дахин дарна уу`
                      : `Зөвхөн PDF, ${CONCLUSION_MAX_FILE_BYTES / 1024 / 1024}MB хүртэл`}
                  </span>
                </span>
              </label>
              <input id="conclusion-file" type="file" accept="application/pdf,.pdf" onChange={handleFile} className="sr-only" />
            </fieldset>

            <Section number={1} title="Дүгнэлтийн мэдээлэл">
              <Field label="Дүгнэлт гаргасан он" required>
                <input
                  value={form.conclusionYear}
                  onChange={set('conclusionYear')}
                  required
                  type="number"
                  min={1990}
                  max={currentYear}
                  placeholder={`ж: ${currentYear}`}
                  className={inputClass}
                />
              </Field>
              <Field label="Дүгнэлтийн дугаар" required>
                <input value={form.conclusionNumber} onChange={set('conclusionNumber')} required placeholder="ж: 04/1234" className={inputClass} />
              </Field>
              <Field label="Дүгнэлтийн төрөл" required className="sm:col-span-2">
                <select value={form.conclusionType} onChange={set('conclusionType')} required className={inputClass}>
                  <option value="">-- Сонгох --</option>
                  {CONCLUSION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
            </Section>

            <Section number={2} title="Төслийн мэдээлэл">
              <Field label="Төслийн нэр" required className="sm:col-span-2">
                <input value={form.projectName} onChange={set('projectName')} required className={inputClass} />
              </Field>
              <Field label="Төслийн ангилал" required>
                <select value={form.projectCategory} onChange={set('projectCategory')} required className={inputClass}>
                  <option value="">-- Сонгох --</option>
                  {CONCLUSION_PROJECT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Төсөл хэрэгжих байршил" required>
                <select value={form.district} onChange={set('district')} required className={inputClass}>
                  <option value="">-- Дүүрэг сонгох --</option>
                  {CONCLUSION_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Төсөл хэрэгжүүлэгчийн нэр" required className="sm:col-span-2">
                <input value={form.implementerName} onChange={set('implementerName')} required className={inputClass} />
              </Field>
            </Section>
          </>
        )}

        {error && <p className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="flex flex-col-reverse items-center gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
          {phase === 0 ? (
            <p className="text-sm text-slate-500">
              Бүртгэлтэй юу?{' '}
              <Link href="/login/sender" className="font-semibold text-teal-700 hover:underline">
                Нэвтрэх
              </Link>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError('');
                goToPhase(0);
              }}
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
            >
              <LuArrowLeft size={16} /> Өмнөх
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#0F766E] px-6 text-sm font-semibold text-white shadow-btn transition-colors hover:bg-[#115E59] disabled:opacity-60 sm:w-auto"
          >
            {phase === 0
              ? loading
                ? 'Шалгаж байна...'
                : 'Дараах'
              : loading
                ? 'Бүртгэж байна...'
                : 'Бүртгүүлж нэвтрэх'}
            {!loading && <LuArrowRight size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
