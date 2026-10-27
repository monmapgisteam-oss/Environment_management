'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LuFileText, LuPencil, LuUpload } from 'react-icons/lu';
import { CONCLUSION_MAX_FILE_BYTES, conclusionFileError } from '@/lib/auth/signup';
import { CONCLUSION_DISTRICTS, CONCLUSION_PROJECT_CATEGORIES, CONCLUSION_TYPES } from '@/lib/reports/conclusions';
import { toast } from '@/lib/toast';

export type ConclusionValues = {
  conclusionYear: string;
  conclusionNumber: string;
  conclusionType: string;
  projectName: string;
  projectCategory: string;
  district: string;
  implementerName: string;
};

const inputClass =
  'h-10 w-full border border-slate-300 bg-white px-3 text-sm text-slate-800 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/10';
const labelClass = 'mb-1 block text-[13px] font-medium text-slate-700';

type Props = {
  initial: ConclusionValues;
  file: { name: string; url: string } | null;
  // A rejected registration goes back to the admin when saved.
  rejected: boolean;
};

// The conclusion sent at sign-up: read view with the file, and an edit form
// to fix the fields or replace the PDF after the reviewers' comments.
export default function ConclusionEditForm({ initial, file, rejected }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initial);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof ConclusionValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    const fileError = picked ? conclusionFileError(picked) : null;
    setError(fileError ?? '');
    setNewFile(fileError ? null : picked);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) body.append(key, value);
      if (newFile) body.append('file', newFile);
      const res = await fetch('/api/registration/conclusion', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Хадгалахад алдаа гарлаа.');
        return;
      }
      toast(data.resubmitted ? 'Дүгнэлтээ засаж дахин илгээлээ. Админ дахин шалгана.' : 'Дүгнэлт шинэчлэгдлээ. Хянагчдад мэдэгдэл очлоо.');
      setEditing(false);
      setNewFile(null);
      router.refresh();
    } catch {
      setError('Сүлжээний алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setSaving(false);
    }
  };

  const details: [string, string][] = [
    ['Дүгнэлтийн дугаар', initial.conclusionNumber],
    ['Дүгнэлт гаргасан он', initial.conclusionYear],
    ['Дүгнэлтийн төрөл', initial.conclusionType],
    ['Төслийн ангилал', initial.projectCategory],
    ['Төсөл хэрэгжих байршил', initial.district],
    ['Төсөл хэрэгжүүлэгч', initial.implementerName],
  ];

  return (
    <section className="border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ерөнхий үнэлгээний дүгнэлт</p>
          <h2 className="mt-0.5 truncate text-base font-semibold text-slate-900">{initial.projectName}</h2>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <LuPencil size={14} /> Засах
          </button>
        )}
      </div>

      {!editing ? (
        <div className="px-6 py-5">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-900">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          {file && (
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center gap-3 border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-teal-300"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-rose-50 text-[10px] font-bold text-rose-600">PDF</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{file.name}</span>
              <span className="text-xs font-semibold text-teal-700">Нээх</span>
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Дүгнэлт гаргасан он</label>
              <input value={form.conclusionYear} onChange={set('conclusionYear')} required type="number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Дүгнэлтийн дугаар</label>
              <input value={form.conclusionNumber} onChange={set('conclusionNumber')} required className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Дүгнэлтийн төрөл</label>
              <select value={form.conclusionType} onChange={set('conclusionType')} required className={inputClass}>
                {CONCLUSION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Төслийн нэр</label>
              <input value={form.projectName} onChange={set('projectName')} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Төслийн ангилал</label>
              <select value={form.projectCategory} onChange={set('projectCategory')} required className={inputClass}>
                {CONCLUSION_PROJECT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Төсөл хэрэгжих байршил</label>
              <select value={form.district} onChange={set('district')} required className={inputClass}>
                {CONCLUSION_DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Төсөл хэрэгжүүлэгчийн нэр</label>
              <input value={form.implementerName} onChange={set('implementerName')} required className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <span className={labelClass}>Дүгнэлтийн файл</span>
              <label
                htmlFor="registration-file"
                className="flex cursor-pointer items-center gap-3 border border-dashed border-slate-300 bg-slate-50 px-4 py-3 transition hover:border-teal-500"
              >
                {newFile ? <LuFileText size={20} className="text-teal-700" /> : <LuUpload size={20} className="text-slate-400" />}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {newFile ? newFile.name : file ? `Одоогийн файл: ${file.name}` : 'PDF файл сонгох'}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {newFile
                      ? `${(newFile.size / 1024 / 1024).toFixed(2)} MB · солих бол дахин дарна уу`
                      : `Солих бол шинэ PDF сонгоно уу (${CONCLUSION_MAX_FILE_BYTES / 1024 / 1024}MB хүртэл)`}
                  </span>
                </span>
              </label>
              <input id="registration-file" type="file" accept="application/pdf,.pdf" onChange={pickFile} className="sr-only" />
            </div>
          </div>

          {error && <p className="mt-4 border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm(initial);
                setNewFile(null);
                setError('');
              }}
              disabled={saving}
              className="h-10 border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Болих
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 bg-[#0F766E] px-5 text-sm font-semibold text-white hover:bg-[#115E59] disabled:opacity-60"
            >
              {saving ? 'Хадгалж байна...' : rejected ? 'Засаад дахин илгээх' : 'Хадгалах'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
