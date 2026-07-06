'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { HiSearch } from 'react-icons/hi';
import StatusBadge from './StatusBadge';
import { formatDate, formatScore, getStatusLabel } from '@/lib/utils';

type Report = {
  id: string;
  reportNumber: string;
  reportType: { name: string };
  title: string;
  submittedAt: string | null;
  status: string;
  finalScore: number | null;
  senderCompany: { name: string } | null;
  location: { province: string; district: string } | null;
  source?: 'web' | 'survey123';
  detailHref?: string;
};

type Props = {
  reports: Report[];
  role?: 'sender' | 'reviewer' | 'staff';
  showStatusFilter?: boolean;
};

const allStatusOptions = [
  { value: '', label: 'Бүгд' },
  { value: 'submitted', label: 'Илгээгдсэн' },
  { value: 'needs_revision', label: 'Засвар шаардсан' },
  { value: 'completed', label: 'Үнэлгээ дууссан' },
];

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100';

export default function ReportTable({ reports, role = 'sender', showStatusFilter = true }: Props) {
  // Draft values bound to the inputs — these change as the user types/selects
  // but do NOT filter the table until "Шүүх" is pressed.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  // Applied values — the table is filtered by these, updated only on "Шүүх".
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [appliedType, setAppliedType] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const statusOptions = useMemo(() => {
    if (role === 'sender') {
      // "assigned" and "return_requested" are internal review states; the sender
      // sees them as submitted / under review.
      return allStatusOptions.filter((s) => s.value !== 'assigned' && s.value !== 'return_requested');
    }
    return allStatusOptions;
  }, [role]);

  const displayStatus = (status: string) => {
    if (role === 'sender' && status === 'assigned') return 'submitted';
    if (role === 'sender' && status === 'return_requested') return 'in_review';
    if (status === 'approved') return 'completed';
    return status;
  };

  const sourceLabel = (source?: Report['source']) =>
    source === 'survey123' ? 'Survey системээс тайлан ирлээ' : null;

  const types = useMemo(() => {
    const set = new Set(reports.map((report) => report.reportType.name));
    return Array.from(set);
  }, [reports]);

  const filtered = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch = [report.reportNumber, report.title, report.senderCompany?.name]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(appliedSearch.toLowerCase()));
      const matchesStatus = appliedStatus ? report.status === appliedStatus : true;
      const matchesType = appliedType ? report.reportType.name === appliedType : true;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, appliedSearch, appliedStatus, appliedType]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSearch = () => {
    setAppliedSearch(search);
    setAppliedStatus(statusFilter);
    setAppliedType(typeFilter);
    setPage(1);
  };

  const handleReset = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setAppliedSearch('');
    setAppliedStatus('');
    setAppliedType('');
    setPage(1);
  };

  // On roles that can show a second stacked action ("Гишүүдэд оноох" / "Үнэлэх"),
  // pin the action column to a fixed width so every button is identical across
  // rows. On the sender table there is only one action, so let it size tightly.
  const actionColClass = role === 'sender' ? 'inline-flex' : 'flex w-[124px]';

  return (
    <div className="space-y-6">
      {/* Filter card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Search */}
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Хайлт</label>
            <div className="relative">
              <HiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Тайлангийн дугаар, төслийн нэр, байгууллага"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          {showStatusFilter && (
            <div className="w-full lg:w-44">
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Төлөв</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={inputClass}
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="w-full lg:w-48">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Тайлангийн төрөл</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">Бүгд</option>
              {types.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-5 text-sm font-semibold text-white transition hover:bg-[#115E59]"
            >
              <HiSearch size={16} />
              Шүүх
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Цэвэрлэх
            </button>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-teal-50/60 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-3.5">№</th>
                <th className="px-4 py-3.5">Тайлангийн дугаар</th>
                <th className="px-4 py-3.5">Тайлангийн төрөл</th>
                <th className="px-4 py-3.5">Төслийн нэр</th>
                <th className="px-4 py-3.5">Байгууллага</th>
                <th className="px-4 py-3.5">Илгээсэн огноо</th>
                <th className="px-4 py-3.5">Төлөв</th>
                <th className="px-4 py-3.5">Эцсийн оноо</th>
                <th className="px-4 py-3.5 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Тайлан олдсонгүй.
                  </td>
                </tr>
              ) : (
                pageItems.map((report, index) => (
                  <tr key={report.id} className="transition-colors hover:bg-teal-50/40">
                    <td className="px-4 py-4 text-slate-400">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{report.reportNumber}</span>
                        {sourceLabel(report.source) && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            {sourceLabel(report.source)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{report.reportType.name}</td>
                    <td className="px-4 py-4 text-slate-600">{report.title}</td>
                    <td className="px-4 py-4 text-slate-600">{report.senderCompany?.name || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-600">{formatDate(report.submittedAt)}</td>
                    <td className="px-4 py-4"><StatusBadge status={displayStatus(report.status)} /></td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{formatScore(report.finalScore)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <div className={`${actionColClass} flex-col items-stretch gap-1.5`}>
                          <Link href={report.detailHref || `/report/${report.id}?role=${role ?? 'sender'}`} className="flex items-center justify-center rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 whitespace-nowrap">Дэлгэрэнгүй</Link>
                          {role === 'reviewer' && report.status !== 'completed' && report.status !== 'approved' && (
                            <Link href={`/reviewer/assign?report=${report.id}`} className="flex items-center justify-center rounded-lg bg-color-primary px-3 py-2 text-xs font-semibold text-white hover:bg-color-primary-dark transition whitespace-nowrap">Гишүүдэд оноох</Link>
                          )}
                          {role === 'staff' && report.status === 'in_review' && (
                            <Link href={`/evaluator/evaluate/${report.id}`} className="flex items-center justify-center rounded-lg bg-color-primary px-3 py-2 text-xs font-semibold text-white hover:bg-color-primary-dark transition whitespace-nowrap">Үнэлэх</Link>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3.5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Нийт <span className="font-semibold text-slate-700">{filtered.length}</span> тайлан</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Өмнөх
            </button>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-[#0F766E] px-2 text-sm font-semibold text-white">{page}</span>
              <span className="text-slate-400">/ {pageCount}</span>
            </div>
            <button
              type="button"
              disabled={page === pageCount}
              onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Дараах
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
