'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { HiSearch } from 'react-icons/hi';
import StatusBadge from '@/components/ui/StatusBadge';
import AssignButton from '@/components/evaluation/AssignButton';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { formatScore, formatShortDate } from '@/lib/utils';
import RowActions, { type RowMenuItem } from '@/components/reports/RowActions';
import { REPORT_NOUN, type ReportNoun } from '@/lib/reports/terms';

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
  // Wording for the rows; a list of plans says БОМТ instead of тайлан.
  noun?: ReportNoun;
  // What will appear here and how, shown when the list is empty.
  emptyHint?: string;
};

const allStatusOptions = [
  { value: '', label: 'Бүгд' },
  { value: 'submitted', label: 'Илгээгдсэн' },
  { value: 'needs_revision', label: 'Засвар шаардсан' },
  { value: 'completed', label: 'Үнэлгээ дууссан' },
];

const inputClass =
  'h-11 w-full border border-slate-200 bg-white px-3.5 text-sm text-slate-700 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100';

export default function ReportTable({ reports, role = 'sender', showStatusFilter = true, noun = REPORT_NOUN, emptyHint }: Props) {
  const visibleReports = useMemo(
    () => reports.filter((report) => report.title !== GENERAL_EVALUATION_CONCLUSION_TITLE),
    [reports],
  );
  // Filters apply as the user types or picks.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

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
    // Senders get the status already masked by the page (lib/reports/scoreRelease.ts);
    // for them an approved report is simply finished.
    if (role === 'sender' && status === 'approved') return 'completed';
    return status;
  };

  const sourceLabel = (source?: Report['source']) =>
    source === 'survey123' ? `Survey системээс ${noun.one} ирлээ` : null;

  const reportTypeLabel = (report: Report) =>
    report.title === GENERAL_EVALUATION_CONCLUSION_TITLE
      ? GENERAL_EVALUATION_CONCLUSION_TITLE
      : report.reportType.name;

  const types = useMemo(() => {
    const set = new Set(visibleReports.map(reportTypeLabel));
    return Array.from(set);
  }, [visibleReports]);

  const filtered = useMemo(() => {
    return visibleReports.filter((report) => {
      const matchesSearch = [report.reportNumber, report.title, report.senderCompany?.name]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search.trim().toLowerCase()));
      const matchesStatus = statusFilter ? report.status === statusFilter : true;
      const matchesType = typeFilter ? reportTypeLabel(report) === typeFilter : true;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [visibleReports, search, statusFilter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleReset = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPage(1);
  };

  // Each row has one main action and the rest in a "more" menu, so the table
  // fits without scrolling sideways.
  // Only a report nobody is assigned to yet gets "Оноох" as its main action;
  // reassigning stays on the report page.
  const needsAssignment = (report: Report) => role === 'reviewer' && report.status === 'submitted';
  const detailHref = (report: Report) => report.detailHref || `/report/${report.id}?role=${role ?? 'sender'}`;
  const primaryAction = (report: Report) => {
    const buttonClass =
      'inline-flex h-9 items-center justify-center whitespace-nowrap bg-color-primary px-3.5 text-xs font-semibold text-white transition hover:bg-color-primary-dark';
    if (needsAssignment(report)) {
      return (
        <AssignButton report={{ id: report.id, reportNumber: report.reportNumber, title: report.title }} className={buttonClass}>
          Оноох
        </AssignButton>
      );
    }
    if (role === 'staff' && report.status === 'in_review') {
      return (
        <Link href={`/evaluator/evaluate/${report.id}`} className={buttonClass}>
          Үнэлэх
        </Link>
      );
    }
    return (
      <Link
        href={detailHref(report)}
        className="inline-flex h-9 items-center justify-center whitespace-nowrap border border-teal-200 bg-white px-3.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
      >
        Дэлгэрэнгүй
      </Link>
    );
  };
  const menuItems = (report: Report): RowMenuItem[] => {
    if (role === 'sender') return [];
    const primaryIsDetail = !(needsAssignment(report) || (role === 'staff' && report.status === 'in_review'));
    return [
      ...(primaryIsDetail ? [] : [{ label: 'Дэлгэрэнгүй', href: detailHref(report) }]),
      { label: `${noun.of} нүүр хуудас`, href: `/report/${report.id}/cover?role=${role === 'staff' ? 'staff' : 'reviewer'}` },
    ];
  };
  const hasFilters = !!(search || statusFilter || typeFilter);

  return (
    <div className="space-y-4">
      {/* Filters apply while typing */}
      <div className="border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label htmlFor="report-table-search" className="mb-1.5 block text-xs font-medium text-slate-500">Хайлт</label>
            <div className="relative">
              <HiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                id="report-table-search"
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={`${noun.of} дугаар, төслийн нэр, байгууллага`}
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          {showStatusFilter && (
            <div className="w-full md:w-44">
              <label htmlFor="report-table-status" className="mb-1.5 block text-xs font-medium text-slate-500">Төлөв</label>
              <select
                id="report-table-status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          )}

          {types.length > 1 && (
            <div className="w-full md:w-48">
              <label htmlFor="report-table-type" className="mb-1.5 block text-xs font-medium text-slate-500">Төрөл</label>
              <select
                id="report-table-type"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="">Бүгд</option>
                {types.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-11 items-center justify-center border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Цэвэрлэх
            </button>
          )}
        </div>
      </div>

      <div className="border border-slate-200 bg-white shadow-soft">
        {pageItems.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-slate-600">
              {hasFilters ? `Хайлтад тохирох ${noun.one} олдсонгүй.` : `Одоогоор ${noun.one} алга.`}
            </p>
            {hasFilters ? (
              <button type="button" onClick={handleReset} className="mt-2 text-sm font-semibold text-teal-700 hover:underline">
                Шүүлтүүрийг цэвэрлэх
              </button>
            ) : (
              emptyHint && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{emptyHint}</p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop: table */}
            <table className="hidden w-full text-sm text-slate-700 md:table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                  <th className="px-4 py-3">Дугаар</th>
                  <th className="px-4 py-3">Төсөл, байгууллага</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Төрөл</th>
                  <th className="px-4 py-3">Огноо</th>
                  <th className="px-4 py-3">Төлөв</th>
                  <th className="px-4 py-3 text-right">Оноо</th>
                  <th className="px-4 py-3"><span className="sr-only">Үйлдэл</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((report, index) => (
                  <tr key={`${report.id}-${index}`} className="transition-colors hover:bg-teal-50/40">
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <Link href={detailHref(report)} className="font-mono text-[13px] font-semibold text-slate-900 hover:text-teal-700">
                        {report.reportNumber}
                      </Link>
                      {sourceLabel(report.source) && (
                        <span className="mt-1 block w-fit bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Survey</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900">{report.title}</p>
                      <p className="text-xs text-slate-500">
                        {report.senderCompany?.name || '-'}
                        <span className="xl:hidden"> · {reportTypeLabel(report)}</span>
                      </p>
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-600 xl:table-cell">{reportTypeLabel(report)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{formatShortDate(report.submittedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5"><StatusBadge status={displayStatus(report.status)} /></td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900">{formatScore(report.finalScore)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {primaryAction(report)}
                        <RowActions items={menuItems(report)} label={report.reportNumber} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phone: cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {pageItems.map((report, index) => (
                <li key={`${report.id}-${index}`} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={detailHref(report)} className="font-mono text-[13px] font-semibold text-slate-900">
                      {report.reportNumber}
                    </Link>
                    <StatusBadge status={displayStatus(report.status)} />
                  </div>
                  <p className="mt-1.5 font-medium text-slate-900">{report.title}</p>
                  <p className="text-xs text-slate-500">
                    {report.senderCompany?.name || '-'} · {reportTypeLabel(report)} · {formatShortDate(report.submittedAt)}
                    {report.finalScore != null && <> · Оноо {formatScore(report.finalScore)}</>}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {primaryAction(report)}
                    <RowActions items={menuItems(report)} label={report.reportNumber} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
          <p>Нийт <span className="font-semibold text-slate-700">{filtered.length}</span> {noun.one}</p>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                className="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Өмнөх
              </button>
              <span className="text-slate-600">
                <span className="font-semibold text-slate-900">{page}</span> / {pageCount}
              </span>
              <button
                type="button"
                disabled={page === pageCount}
                onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}
                className="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Дараах
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
