import Link from 'next/link';
import { HiDocumentText, HiSearch } from 'react-icons/hi';
import { downloadUrl } from '@/lib/attachments';
import type { ConclusionRow, ConclusionSearchParams } from '@/lib/conclusions';
import {
  CONCLUSION_PROJECT_CATEGORIES,
  CONCLUSION_PROVINCES,
  CONCLUSION_TYPES,
} from '@/lib/conclusions';

type Props = {
  rows: ConclusionRow[];
  search: ConclusionSearchParams;
  role: 'reviewer' | 'staff';
};

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 transition focus:border-color-primary focus:outline-none focus:ring-2 focus:ring-color-primary/10';

function formatIsoDate(value?: string | Date | null) {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ConclusionSearchResults({ rows, search, role }: Props) {
  const detailRole = role === 'reviewer' ? 'reviewer' : 'staff';

  return (
    <div className="space-y-6">
      <form className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-color-primary">
            <HiSearch size={18} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Хайлтын хэсэг</h2>
        </div>
        <div className="grid gap-x-10 gap-y-5 p-6 lg:grid-cols-2">
          <label className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
            <span className="text-sm font-medium text-slate-500">Дүгнэлт гаргасан он:</span>
            <input name="year" defaultValue={search.year || ''} className={inputClass} />
          </label>
          <label className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
            <span className="text-sm font-medium text-slate-500">Дүгнэлтийн дугаар:</span>
            <input name="number" defaultValue={search.number || ''} className={inputClass} />
          </label>
          <label className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
            <span className="text-sm font-medium text-slate-500">Төслийн ангилал:</span>
            <select name="category" defaultValue={search.category || ''} className={inputClass}>
              <option value="">-- Бүх төрөл --</option>
              {CONCLUSION_PROJECT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
            <span className="text-sm font-medium text-slate-500">Төслийн нэр:</span>
            <input name="project" defaultValue={search.project || ''} className={inputClass} />
          </label>
          <label className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
            <span className="text-sm font-medium text-slate-500">Төсөл хэрэгжих аймгийн нэр:</span>
            <select name="province" defaultValue={search.province || ''} className={inputClass}>
              <option value="">-- Бүх аймаг --</option>
              {CONCLUSION_PROVINCES.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
            <span className="text-sm font-medium text-slate-500">Төсөл хэрэгжүүлэгчийн нэр:</span>
            <input name="implementer" defaultValue={search.implementer || ''} className={inputClass} />
          </label>
          <label className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
            <span className="text-sm font-medium text-slate-500">Дүгнэлтийн төрөл:</span>
            <select name="kind" defaultValue={search.kind || ''} className={inputClass}>
              <option value="">-- Бүх төрөл --</option>
              {CONCLUSION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center justify-end gap-3">
            <Link
              href={role === 'reviewer' ? '/reviewer/conclusions' : '/evaluator/conclusions'}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Цэвэрлэх
            </Link>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-color-primary px-7 text-sm font-bold text-white shadow-btn transition hover:bg-color-primary-dark"
            >
              <HiSearch size={18} />
              Хайх
            </button>
          </div>
        </div>
      </form>

      <div className="flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/80 px-5 py-4 text-sm font-medium text-color-primary">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-color-primary shadow-sm">
          <HiDocumentText size={17} />
        </div>
        <span>Нийт {rows.length} дүгнэлт байна.</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead>
              <tr className="bg-color-primary text-left text-xs font-bold text-white">
                <th className="border-r border-white/20 px-3 py-3 align-top">№</th>
                <th className="border-r border-white/20 px-3 py-3 align-top">↕ Дүгнэлт гаргасан огноо</th>
                <th className="border-r border-white/20 px-3 py-3 align-top">↕ Дүгнэлтийн дугаар</th>
                <th className="border-r border-white/20 px-3 py-3 align-top">↕ Төслийн ангилал</th>
                <th className="border-r border-white/20 px-3 py-3 align-top">Төслийн нэр</th>
                <th className="border-r border-white/20 px-3 py-3 align-top">Төсөл хэрэгжих аймгийн нэр</th>
                <th className="border-r border-white/20 px-3 py-3 align-top">Төсөл хэрэгжих сумын нэр</th>
                <th className="border-r border-white/20 px-3 py-3 align-top">Төсөл хэрэгжүүлэгчийн нэр</th>
                <th className="border-r border-white/20 px-3 py-3 align-top">↕ Дүгнэлтийн төрөл</th>
                <th className="px-3 py-3 text-right align-top"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    Дүгнэлт олдсонгүй.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="transition-colors hover:bg-teal-50/40">
                    <td className="border-r border-slate-100 px-3 py-4 text-slate-500">{index + 1}</td>
                    <td className="border-r border-slate-100 px-3 py-4 whitespace-nowrap">{formatIsoDate(row.submittedAt)}</td>
                    <td className="border-r border-slate-100 px-3 py-4 font-semibold text-slate-900">{row.reportNumber}</td>
                    <td className="border-r border-slate-100 px-3 py-4">{row.reportTypeName}</td>
                    <td className="border-r border-slate-100 px-3 py-4">
                      <p>{row.title}</p>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {row.attachments.map((file) => (
                          <div key={`${row.id}-${file.url}`} className="flex items-center gap-2 whitespace-nowrap">
                            <span className="max-w-[180px] truncate text-slate-600">{file.name}</span>
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-color-primary hover:underline">
                              Нээх
                            </a>
                            <a href={downloadUrl(file)} className="text-xs font-semibold text-color-primary hover:underline">
                              Татах
                            </a>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="border-r border-slate-100 px-3 py-4">{row.province || '-'}</td>
                    <td className="border-r border-slate-100 px-3 py-4">{row.district || '-'}</td>
                    <td className="border-r border-slate-100 px-3 py-4">{row.implementerName || row.senderCompanyName || '-'}</td>
                    <td className="border-r border-slate-100 px-3 py-4">{row.conclusionType}</td>
                    <td className="px-3 py-4 text-right">
                      <Link
                        href={`/report/${row.id}?role=${detailRole}`}
                        className="inline-flex items-center justify-center rounded-lg bg-color-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-color-primary-dark"
                      >
                        Дэлгэрэнгүй
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
