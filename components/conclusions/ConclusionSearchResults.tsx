import Link from 'next/link';
import type { ReactNode } from 'react';
import { HiSearch } from 'react-icons/hi';
import { downloadUrl } from '@/lib/reports/attachments';
import TableExportToolbar from '@/components/ui/TableExportToolbar';
import type { ConclusionRow, ConclusionSearchParams } from '@/lib/reports/conclusions';
import {
  CONCLUSION_DISTRICTS,
  CONCLUSION_PROJECT_CATEGORIES,
  CONCLUSION_TYPES,
} from '@/lib/reports/conclusions';

type Props = {
  rows: ConclusionRow[];
  search: ConclusionSearchParams;
  role: 'reviewer' | 'staff';
};

const inputClass =
  'h-11 w-full border border-slate-200 bg-white px-3.5 text-sm text-slate-700 transition focus:border-color-primary focus:outline-none focus:ring-2 focus:ring-color-primary/10';
const headerCellClass =
  'border-r border-emerald-800/70 px-3 py-4 align-middle text-left text-[12px] font-semibold leading-5 text-emerald-50 last:border-r-0';

function HeaderCell({ children, sortable = false, align = 'left' }: { children?: ReactNode; sortable?: boolean; align?: 'left' | 'right' }) {
  return (
    <th className={`${headerCellClass} ${align === 'right' ? 'text-right' : ''}`}>
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
        {sortable && <span className="rounded bg-emerald-700 px-1 text-[10px] leading-4 text-emerald-50">↕</span>}
        <span>{children}</span>
      </div>
    </th>
  );
}

export default function ConclusionSearchResults({ rows, search, role }: Props) {
  const detailRole = role === 'reviewer' ? 'reviewer' : 'staff';
  const exportHeaders = [
    '№',
    'Дүгнэлт гаргасан он',
    'Дүгнэлтийн дугаар',
    'Төслийн ангилал',
    'Төслийн нэр',
    'Төсөл хэрэгжих байршил',
    'Төсөл хэрэгжүүлэгчийн нэр',
    'Дүгнэлтийн төрөл',
  ];
  const exportRows = rows.map((row, index) => [
    index + 1,
    row.year || '-',
    row.conclusionNumber,
    row.category,
    row.projectName,
    row.district || '-',
    row.implementerName || row.senderCompanyName || '-',
    row.conclusionType,
  ]);

  return (
    <div className="space-y-6">
      <form className="overflow-hidden border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center bg-teal-50 text-color-primary">
            <HiSearch size={18} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Хайлтын хэсэг</h2>
        </div>
        <div className="grid gap-x-10 gap-y-5 p-6 lg:grid-cols-2">
          <label className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
            <span className="text-sm font-medium text-slate-500">Дүгнэлт гаргасан он:</span>
            <input name="year" inputMode="numeric" defaultValue={search.year || ''} className={inputClass} />
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
            <span className="text-sm font-medium text-slate-500">Төсөл хэрэгжих байршил:</span>
            <select name="district" defaultValue={search.district || ''} className={inputClass}>
              <option value="">-- Бүх дүүрэг --</option>
              {CONCLUSION_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
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
              className="inline-flex h-11 items-center justify-center border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Цэвэрлэх
            </Link>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 bg-color-primary px-7 text-sm font-bold text-white shadow-btn transition hover:bg-color-primary-dark"
            >
              <HiSearch size={18} />
              Хайх
            </button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden border border-slate-200 bg-white shadow-soft">
        <TableExportToolbar headers={exportHeaders} rows={exportRows} fileName="dugnelt" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead>
              <tr className="bg-[#064E3B]">
                <HeaderCell>№</HeaderCell>
                <HeaderCell sortable>Дүгнэлт гаргасан он</HeaderCell>
                <HeaderCell sortable>Дүгнэлтийн дугаар</HeaderCell>
                <HeaderCell sortable>Төслийн ангилал</HeaderCell>
                <HeaderCell>Төслийн нэр</HeaderCell>
                <HeaderCell>Төсөл хэрэгжих байршил</HeaderCell>
                <HeaderCell>Төсөл хэрэгжүүлэгчийн нэр</HeaderCell>
                <HeaderCell sortable>Дүгнэлтийн төрөл</HeaderCell>
                <HeaderCell align="right"></HeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-600">Дүгнэлт олдсонгүй.</p>
                    <p className="mx-auto mt-1 max-w-md text-sm">
                      Илгээгч байгууллага бүртгүүлэхдээ ерөнхий үнэлгээний дүгнэлтээ хавсаргахад энд харагдана.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="transition-colors hover:bg-teal-50/40">
                    <td className="border-r border-slate-100 px-3 py-4 text-slate-500">{index + 1}</td>
                    <td className="border-r border-slate-100 px-3 py-4 whitespace-nowrap">{row.year || '-'}</td>
                    <td className="border-r border-slate-100 px-3 py-4 font-semibold text-slate-900">{row.conclusionNumber}</td>
                    <td className="border-r border-slate-100 px-3 py-4">{row.category}</td>
                    <td className="border-r border-slate-100 px-3 py-4">
                      <p>{row.projectName}</p>
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
                    <td className="border-r border-slate-100 px-3 py-4">{row.district || '-'}</td>
                    <td className="border-r border-slate-100 px-3 py-4">{row.implementerName || row.senderCompanyName || '-'}</td>
                    <td className="border-r border-slate-100 px-3 py-4">{row.conclusionType}</td>
                    <td className="px-3 py-4 text-right">
                      <Link
                        href={`/report/${row.id}?role=${detailRole}`}
                        className="inline-flex items-center justify-center bg-color-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-color-primary-dark"
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
