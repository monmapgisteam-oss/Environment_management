'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiSearch, HiChevronDown } from 'react-icons/hi';
import { formatDate } from '@/lib/utils';
import { normalizeSurveyReportType } from '@/lib/survey/reportType';

// Same survey layer the report pages match against by register — here the
// manager/staff search it directly instead of only auto-matching one report's
// register.
const SURVEY_QUERY_URL = '/api/survey/features';

type SurveyRow = {
  objectId: number;
  projectName: string | null;
  organization: string | null;
  reportType: string | null;
  register: string | null;
  projectDate: number | null;
  description: string | null;
};

// GeoJSON feature from /api/survey/features; properties are the raw survey
// attributes, of which only these are read.
type SurveyFeature = {
  properties: {
    objectid: number;
    project_name?: string | null;
    Organization?: string | null;
    Report_type?: unknown;
    Register?: string | null;
    Project_date?: number | null;
    Description?: string | null;
  };
};

type ReportMatch = {
  id: string;
  reportNumber: string;
  title: string;
  status: string;
  reportType: { name: string };
};

export default function SurveyLookup({ role = 'reviewer' }: { role?: 'reviewer' | 'staff' }) {
  const router = useRouter();
  const [register, setRegister] = useState('');
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Тайлбар click flow: look up which Report(s) our own DB has for that
  // survey row's register, so staff can jump straight to the score table.
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [matchLoading, setMatchLoading] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, ReportMatch[]>>({});

  const load = async (reg: string) => {
    setLoading(true);
    setError('');
    try {
      const query = reg ? `?${new URLSearchParams({ register: reg, match: 'contains' })}` : '';
      const res = await fetch(`${SURVEY_QUERY_URL}${query}`);
      if (!res.ok) throw new Error('Survey lookup failed');
      const data: { features?: SurveyFeature[] } = await res.json();
      const features = data.features || [];
      setRows(
        features.map((f) => ({
          objectId: f.properties.objectid,
          projectName: f.properties.project_name ?? null,
          organization: f.properties.Organization ?? null,
          reportType: normalizeSurveyReportType(f.properties.Report_type) || null,
          register: f.properties.Register ?? null,
          projectDate: f.properties.Project_date ?? null,
          description: f.properties.Description ?? null,
        })),
      );
    } catch {
      setError('Мэдээлэл татахад алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setLoading(false);
    }
  };

  // Show every record as soon as the section opens; searching just narrows it.
  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    load(register.trim());
  };

  // A single matching report jumps straight to its score table; several
  // matches expand inline so the user can pick one; none shows a note.
  const openScores = async (row: SurveyRow) => {
    if (!row.register) return;
    if (matches[row.objectId]) {
      setExpandedId(expandedId === row.objectId ? null : row.objectId);
      return;
    }
    setMatchLoading(row.objectId);
    try {
      const res = await fetch(`/api/reports/by-register?register=${encodeURIComponent(row.register)}`);
      const data: { reports?: ReportMatch[] } = await res.json();
      const found = data.reports || [];
      if (found.length === 1) {
        router.push(`/report/${found[0].id}/scores?role=${role}`);
        return;
      }
      setMatches((prev) => ({ ...prev, [row.objectId]: found }));
      setExpandedId(row.objectId);
    } finally {
      setMatchLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={search} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Байгууллагын РД</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <HiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={register}
              onChange={(e) => setRegister(e.target.value)}
              placeholder="Регистрийн дугаар оруулна уу..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-700 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-6 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:opacity-60"
          >
            <HiSearch size={16} />
            {loading ? 'Хайж байна...' : 'Хайх'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
          <span>Нийт: <span className="font-semibold text-slate-700">{rows.length}</span></span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-teal-50/60 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                <th className="px-4 py-3.5">Тайлангийн төрөл</th>
                <th className="px-4 py-3.5">Төслийн нэр</th>
                <th className="px-4 py-3.5">Хэрэгжүүлэгчийн нэр</th>
                <th className="px-4 py-3.5">Хэрэгжүүлэгчийн РД</th>
                <th className="px-4 py-3.5">Огноо</th>
                <th className="px-4 py-3.5">Тайлбар</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Ачааллаж байна...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Судалгаа олдсонгүй.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <Fragment key={row.objectId}>
                    <tr className="transition-colors hover:bg-teal-50/40">
                      <td className="px-4 py-4 text-slate-600">{row.reportType || '-'}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{row.projectName || '-'}</td>
                      <td className="px-4 py-4 text-slate-600">{row.organization || '-'}</td>
                      <td className="px-4 py-4 text-slate-600">{row.register || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-slate-600">
                        {row.projectDate ? formatDate(new Date(row.projectDate)) : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">{row.description}</span>
                          {row.register && (
                            <button
                              type="button"
                              onClick={() => openScores(row)}
                              disabled={matchLoading === row.objectId}
                              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-60 whitespace-nowrap"
                            >
                              {matchLoading === row.objectId ? 'Хайж байна...' : 'Дэлгэрэнгүй'}
                              <HiChevronDown
                                size={12}
                                className={`shrink-0 transition-transform ${expandedId === row.objectId ? 'rotate-180' : ''}`}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === row.objectId && matches[row.objectId] && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={6} className="px-4 py-3">
                          {matches[row.objectId].length === 0 ? (
                            <p className="text-sm text-slate-500">Энэ регистрт тохирох тайлан манай системд алга байна.</p>
                          ) : (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-slate-500">Тохирох тайлангууд — үнэлгээ харах бол сонгоно уу:</p>
                              {matches[row.objectId].map((m) => (
                                <a
                                  key={m.id}
                                  href={`/report/${m.id}/scores?role=${role}`}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-teal-300 hover:bg-teal-50/40"
                                >
                                  <span className="font-medium text-slate-800">{m.reportNumber} — {m.title}</span>
                                  <span className="text-xs text-slate-500">{m.reportType.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
