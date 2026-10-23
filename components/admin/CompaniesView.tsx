'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  HiSearch,
  HiOfficeBuilding,
  HiIdentification,
  HiUser,
  HiMail,
  HiPhone,
  HiLocationMarker,
} from 'react-icons/hi';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatScore } from '@/lib/utils';

export type CompanySurvey = {
  id: string;
  reportNumber: string;
  reportTypeName: string;
  title: string;
  implementerName: string | null;
  implementerRegister: string | null;
  approvedDate: string | null;
  submittedAt: string | null;
  status: string;
  finalScore: number | null;
  location: {
    addressDetail: string | null;
  } | null;
};

export type CompanyContact = {
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
};

export type CompanyRow = {
  id: string;
  name: string;
  registerNumber: string;
  type: string;
  contacts: CompanyContact[];
  surveys: CompanySurvey[];
};

const TYPE_LABELS: Record<string, string> = {
  sender: 'Илгээгч байгууллага',
  reviewer: 'Хянагч байгууллага',
  admin: 'Системийн админ',
};

const TYPE_BADGE: Record<string, string> = {
  sender: 'badge-blue',
  reviewer: 'badge-purple',
  admin: 'badge-gray',
};

const inputClass =
  'h-11 w-full border border-slate-200 bg-white px-3.5 text-sm text-slate-700 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100';

function formatLocation(loc: CompanySurvey['location']) {
  return loc?.addressDetail || '—';
}

export default function CompaniesView({ companies }: { companies: CompanyRow[] }) {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');

  const filled = companies.filter((c) => c.surveys.length > 0);

  const visible = useMemo(() => {
    const term = applied.trim().toLowerCase();
    return companies.filter((c) => {
      if (!term) return true;
      return (
        c.name.toLowerCase().includes(term) ||
        c.registerNumber.toLowerCase().includes(term)
      );
    });
  }, [companies, applied]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="border border-emerald-100 bg-emerald-50/70 p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <HiOfficeBuilding size={20} />
            </div>
            <span className="text-sm font-medium text-slate-600">Нийт байгууллага</span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-600">{companies.length}</p>
        </div>
        <div className="border border-blue-100 bg-blue-50/70 p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <HiLocationMarker size={20} />
            </div>
            <span className="text-sm font-medium text-slate-600">Судалгаа бөглөсөн</span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-blue-600">{filled.length}</p>
        </div>
        <div className="border border-violet-100 bg-violet-50/70 p-5 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <HiIdentification size={20} />
            </div>
            <span className="text-sm font-medium text-slate-600">Нийт судалгаа</span>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-violet-600">
            {companies.reduce((sum, c) => sum + c.surveys.length, 0)}
          </p>
        </div>
      </section>

      {/* Filter */}
      <div className="border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Хайлт</label>
            <div className="relative">
              <HiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setApplied(search); }}
                placeholder="Байгууллагын нэр, регистрийн дугаар"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setApplied(search)}
              className="inline-flex h-11 items-center justify-center gap-2 bg-[#0F766E] px-5 text-sm font-semibold text-white transition hover:bg-[#115E59]"
            >
              <HiSearch size={16} />
              Шүүх
            </button>
            <button
              type="button"
              onClick={() => { setSearch(''); setApplied(''); }}
              className="inline-flex h-11 items-center justify-center border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Цэвэрлэх
            </button>
          </div>
        </div>
      </div>

      {/* Company cards */}
      {visible.length === 0 ? (
        <div className="border border-slate-200 bg-white px-4 py-16 text-center text-slate-400 shadow-soft">
          Байгууллага олдсонгүй.
        </div>
      ) : (
        <div className="space-y-5">
          {visible.map((company) => (
            <div key={company.id} className="overflow-hidden border border-slate-200 bg-white shadow-soft">
              {/* Company header */}
              <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-emerald-100 text-emerald-600">
                    <HiOfficeBuilding size={24} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{company.name}</h3>
                      <span className={`inline-flex items-center whitespace-nowrap px-3 py-1 text-xs font-semibold ${TYPE_BADGE[company.type] ?? 'badge-gray'}`}>
                        {TYPE_LABELS[company.type] ?? company.type}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <HiIdentification size={15} className="text-slate-400" />
                      Хэрэгжүүлэгчийн РД: <span className="font-medium text-slate-700">{company.registerNumber}</span>
                    </p>
                  </div>
                </div>

                {/* Contacts */}
                {company.contacts.length > 0 && (
                  <div className="flex flex-col gap-1.5 text-sm text-slate-600 lg:items-end">
                    {company.contacts.map((c, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          <HiUser size={14} className="text-slate-400" />
                          {c.name}{c.position ? ` · ${c.position}` : ''}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <HiMail size={14} className="text-slate-400" />
                          {c.email}
                        </span>
                        {c.phone && (
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <HiPhone size={14} className="text-slate-400" />
                            {c.phone}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Surveys table */}
              {company.surveys.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">
                  Энэ байгууллага судалгаа бөглөөгүй байна.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-slate-700">
                    <thead>
                      <tr className="border-b border-slate-200 bg-teal-50/50 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                        <th className="px-4 py-3">Тайлангийн дугаар</th>
                        <th className="px-4 py-3">Төрөл</th>
                        <th className="px-4 py-3">Төслийн нэр</th>
                        <th className="px-4 py-3">Хэрэгжүүлэгч</th>
                        <th className="px-4 py-3">Байршил</th>
                        <th className="px-4 py-3">Илгээсэн огноо</th>
                        <th className="px-4 py-3">Төлөв</th>
                        <th className="px-4 py-3">Оноо</th>
                        <th className="px-4 py-3 text-right">Үйлдэл</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {company.surveys.map((s) => (
                        <tr key={s.id} className="transition-colors hover:bg-teal-50/40">
                          <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">{s.reportNumber}</td>
                          <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{s.reportTypeName}</td>
                          <td className="px-4 py-3.5 text-slate-600">{s.title || '—'}</td>
                          <td className="px-4 py-3.5 text-slate-600">
                            {s.implementerName || '—'}
                            {s.implementerRegister ? (
                              <span className="block text-xs text-slate-400">{s.implementerRegister}</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">{formatLocation(s.location)}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">{formatDate(s.submittedAt)}</td>
                          <td className="px-4 py-3.5"><StatusBadge status={s.status} /></td>
                          <td className="px-4 py-3.5 font-semibold text-slate-900">{formatScore(s.finalScore)}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex justify-end">
                              <Link
                                href={`/report/${s.id}?role=reviewer`}
                                className="flex items-center justify-center border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 whitespace-nowrap"
                              >
                                Дэлгэрэнгүй
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
