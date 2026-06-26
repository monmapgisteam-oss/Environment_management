'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import StatusBadge from './StatusBadge';
import { formatDate, getStatusLabel } from '@/lib/utils';

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
};

type Props = {
  reports: Report[];
  role?: 'sender' | 'reviewer';
};

const allStatusOptions = [
  { value: '', label: 'Бүгд' },
  { value: 'draft', label: 'Ноорог' },
  { value: 'submitted', label: 'Илгээгдсэн' },
  { value: 'assigned', label: 'Гишүүдэд оноосон' },
  { value: 'in_review', label: 'Хянагдаж байна' },
  { value: 'needs_revision', label: 'Засвар шаардсан' },
  { value: 'completed', label: 'Үнэлгээ дууссан' },
  { value: 'rejected', label: 'Татгалзсан' },
];

export default function ReportTable({ reports, role = 'sender' }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const statusOptions = useMemo(() => {
    if (role === 'sender') {
      return allStatusOptions.filter((s) => s.value !== 'assigned');
    }
    return allStatusOptions;
  }, [role]);

  const displayStatus = (status: string) => {
    if (role === 'sender' && status === 'assigned') return 'submitted';
    if (status === 'approved') return 'completed';
    return status;
  };

  const types = useMemo(() => {
    const set = new Set(reports.map((report) => report.reportType.name));
    return Array.from(set);
  }, [reports]);

  const filtered = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch = [report.reportNumber, report.title, report.senderCompany?.name]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter ? report.status === statusFilter : true;
      const matchesType = typeFilter ? report.reportType.name === typeFilter : true;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, search, statusFilter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-soft border border-slate-200">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid w-full gap-3 xl:grid-cols-[1fr_auto]">
          <div className="grid gap-3 xl:grid-cols-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Тайлангийн дугаар, төслийн нэр, байгууллага"
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Тайлангийн төрөл</option>
              {types.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="inline-flex h-12 items-center justify-center rounded-3xl bg-[#1E293B] px-6 text-sm font-semibold text-white transition hover:bg-[#334155]">
          Шүүлтүүр
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
          <thead className="bg-slate-50 text-left uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">№</th>
              <th className="px-4 py-3">Тайлангийн дугаар</th>
              <th className="px-4 py-3">Тайлангийн төрөл</th>
              <th className="px-4 py-3">Төслийн нэр</th>
              <th className="px-4 py-3">Илгээсэн огноо</th>
              <th className="px-4 py-3">Төлөв</th>
              <th className="px-4 py-3">Эцсийн оноо</th>
              <th className="px-4 py-3">Үйлдэл</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {pageItems.map((report, index) => (
              <tr key={report.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 text-slate-600">{(page - 1) * pageSize + index + 1}</td>
                <td className="px-4 py-4 font-semibold text-slate-900">{report.reportNumber}</td>
                <td className="px-4 py-4 text-slate-700">{report.reportType.name}</td>
                <td className="px-4 py-4 text-slate-700">{report.title}</td>
                <td className="px-4 py-4 text-slate-700">{formatDate(report.submittedAt)}</td>
                <td className="px-4 py-4"><StatusBadge status={displayStatus(report.status)} /></td>
                <td className="px-4 py-4 text-slate-700">{report.finalScore ?? '-'}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1.5">
                    <Link href={`/report/${report.id}?role=${role ?? 'sender'}`} className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition whitespace-nowrap">Дэлгэрэнгүй</Link>
                    {role === 'reviewer' && (
                      <Link href={`/reviewer/evaluate/${report.id}`} className="inline-flex items-center justify-center rounded-lg bg-color-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-color-primary-dark transition whitespace-nowrap">Үнэлгээ өгөх</Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <p>Нийт {filtered.length} тайлан</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Өмнөх
          </button>
          <span>
            {page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page === pageCount}
            onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Дараах
          </button>
        </div>
      </div>
    </div>
  );
}
