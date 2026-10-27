'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { HiChevronDown, HiChevronRight, HiMail, HiPhone, HiSearch, HiUser } from 'react-icons/hi';
import KpiStrip from '@/components/ui/KpiStrip';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatScore } from '@/lib/utils';

export type CompanyReport = {
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
  reports: CompanyReport[];
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

const CONTACTS_SHOWN = 6;

function formatLocation(loc: CompanyReport['location']) {
  return loc?.addressDetail || '—';
}

function initials(name: string) {
  const words = name.replace(/[«»"']/g, '').trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
}

function ContactCard({ contact }: { contact: CompanyContact }) {
  return (
    <div className="min-w-0 border border-slate-200 bg-white px-3.5 py-3">
      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
        <HiUser size={14} className="shrink-0 text-slate-400" />
        {contact.name}
      </p>
      {contact.position && <p className="mt-0.5 truncate pl-5 text-xs text-slate-500">{contact.position}</p>}
      <div className="mt-2 space-y-1 pl-5 text-xs">
        <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 truncate text-slate-600 hover:text-teal-700">
          <HiMail size={13} className="shrink-0 text-slate-400" />
          {contact.email}
        </a>
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-slate-600 hover:text-teal-700">
            <HiPhone size={13} className="shrink-0 text-slate-400" />
            {contact.phone}
          </a>
        )}
      </div>
    </div>
  );
}

function ReportsTable({ reports }: { reports: CompanyReport[] }) {
  if (reports.length === 0) {
    return (
      <p className="border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-400">
        Энэ байгууллага тайлан илгээгээгүй байна.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="min-w-full text-sm text-slate-700">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2.5">Дугаар</th>
            <th className="px-4 py-2.5">Төрөл</th>
            <th className="px-4 py-2.5">Төслийн нэр</th>
            <th className="px-4 py-2.5">Байршил</th>
            <th className="px-4 py-2.5">Илгээсэн</th>
            <th className="px-4 py-2.5">Төлөв</th>
            <th className="px-4 py-2.5 text-right">Оноо</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {reports.map((s) => (
            <tr key={s.id} className="transition-colors hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] font-semibold text-slate-900">{s.reportNumber}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{s.reportTypeName}</td>
              <td className="max-w-[16rem] truncate px-4 py-2.5 text-slate-700" title={s.title}>
                {s.title || '—'}
              </td>
              <td className="max-w-[12rem] truncate px-4 py-2.5 text-slate-600">{formatLocation(s.location)}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(s.submittedAt)}</td>
              <td className="px-4 py-2.5">
                <StatusBadge status={s.status} />
              </td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatScore(s.finalScore)}</td>
              <td className="px-4 py-2.5 text-right">
                <Link
                  href={`/report/${s.id}?role=reviewer`}
                  className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  Нээх <HiChevronRight size={14} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompanyDetails({ company }: { company: CompanyRow }) {
  const [allContacts, setAllContacts] = useState(false);
  const contacts = allContacts ? company.contacts : company.contacts.slice(0, CONTACTS_SHOWN);
  return (
    <div className="space-y-5 border-t border-slate-200 bg-slate-50/70 px-5 py-5">
      <section>
        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Холбоо барих ({company.contacts.length})
        </h4>
        {company.contacts.length === 0 ? (
          <p className="text-sm text-slate-400">Бүртгэлтэй хэрэглэгч алга.</p>
        ) : (
          <>
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {contacts.map((contact) => (
                <ContactCard key={contact.email} contact={contact} />
              ))}
            </div>
            {company.contacts.length > CONTACTS_SHOWN && (
              <button
                type="button"
                onClick={() => setAllContacts((value) => !value)}
                className="mt-2.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                {allContacts ? 'Хураах' : `Бүгдийг харах (${company.contacts.length})`}
              </button>
            )}
          </>
        )}
      </section>

      <section>
        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Тайлангууд ({company.reports.length})</h4>
        <ReportsTable reports={company.reports} />
      </section>
    </div>
  );
}

type TypeFilter = '' | 'sender' | 'reviewer';

export default function CompaniesView({ companies }: { companies: CompanyRow[] }) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filled = companies.filter((c) => c.reports.length > 0);
  const totalReports = companies.reduce((sum, c) => sum + c.reports.length, 0);
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach((c) => { counts[c.type] = (counts[c.type] ?? 0) + 1; });
    return counts;
  }, [companies]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (type && c.type !== type) return false;
      if (!term) return true;
      return c.name.toLowerCase().includes(term) || c.registerNumber.toLowerCase().includes(term);
    });
  }, [companies, search, type]);

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const tabs: { value: TypeFilter; label: string; count: number }[] = [
    { value: '', label: 'Бүгд', count: companies.length },
    { value: 'sender', label: 'Илгээгч', count: typeCounts.sender ?? 0 },
    { value: 'reviewer', label: 'Хянагч', count: typeCounts.reviewer ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <KpiStrip
        items={[
          {
            label: 'Нийт байгууллага',
            value: companies.length,
            note: `${typeCounts.sender ?? 0} илгээгч · ${typeCounts.reviewer ?? 0} хянагч`,
            accent: 'bg-teal-600',
          },
          { label: 'Тайлан илгээсэн', value: filled.length, note: 'Нэгээс доошгүй тайлантай', accent: 'bg-sky-500' },
          { label: 'Нийт тайлан', value: totalReports, note: 'Илгээсэн БОМТ', accent: 'bg-violet-500' },
        ]}
      />

      <section className="border border-slate-200 bg-white shadow-soft">
        {/* Toolbar: instant search and type tabs */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <HiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Байгууллагын нэр, регистрийн дугаар"
              className="h-10 w-full border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div className="flex border border-slate-200 bg-slate-50 p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.value || 'all'}
                type="button"
                onClick={() => setType(tab.value)}
                className={`inline-flex h-9 items-center gap-1.5 px-3.5 text-sm font-medium transition ${
                  type === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                <span className="text-xs tabular-nums text-slate-400">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Column titles (wide screens) */}
        <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.6fr)_7rem_9rem_1.5rem] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
          <span>Байгууллага</span>
          <span>Регистр</span>
          <span>Холбоо барих</span>
          <span className="text-right">Тайлан</span>
          <span>Сүүлд илгээсэн</span>
          <span />
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-slate-400">Байгууллага олдсонгүй.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {visible.map((company) => {
              const open = expanded.has(company.id);
              const lead = company.contacts[0];
              const lastSubmitted = company.reports.find((s) => s.submittedAt)?.submittedAt ?? null;
              return (
                <li key={company.id}>
                  <button
                    type="button"
                    onClick={() => toggle(company.id)}
                    aria-expanded={open}
                    className={`grid w-full grid-cols-[minmax(0,1fr)_1.5rem] items-center gap-4 px-5 py-3.5 text-left transition lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.6fr)_7rem_9rem_1.5rem] ${
                      open ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center text-sm font-bold ${
                          company.type === 'reviewer' ? 'bg-violet-50 text-violet-700' : 'bg-teal-50 text-teal-700'
                        }`}
                      >
                        {initials(company.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{company.name}</span>
                        <span className={`mt-1 inline-flex px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[company.type] ?? 'badge-gray'}`}>
                          {TYPE_LABELS[company.type] ?? company.type}
                        </span>
                        {/* Narrow screens: the other columns in one line */}
                        <span className="mt-1 block truncate text-xs text-slate-500 lg:hidden">
                          РД {company.registerNumber} · {company.reports.length} тайлан · {company.contacts.length} хэрэглэгч
                        </span>
                      </span>
                    </span>
                    <span className="hidden truncate font-mono text-[13px] text-slate-700 lg:block">{company.registerNumber}</span>
                    <span className="hidden min-w-0 lg:block">
                      {lead ? (
                        <>
                          <span className="block truncate text-sm text-slate-800">{lead.name}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {company.contacts.length > 1 ? `+${company.contacts.length - 1} хэрэглэгч` : lead.email}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </span>
                    <span className="hidden text-right lg:block">
                      <span
                        className={`inline-flex min-w-[2rem] justify-center px-2 py-0.5 text-sm font-semibold tabular-nums ${
                          company.reports.length ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {company.reports.length}
                      </span>
                    </span>
                    <span className="hidden whitespace-nowrap text-sm text-slate-600 lg:block">
                      {lastSubmitted ? formatDate(lastSubmitted) : '—'}
                    </span>
                    <HiChevronDown size={18} className={`justify-self-end text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <CompanyDetails company={company} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
