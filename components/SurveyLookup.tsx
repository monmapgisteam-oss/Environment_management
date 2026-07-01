'use client';

import { useEffect, useState } from 'react';
import { HiSearch } from 'react-icons/hi';
import { formatDate } from '@/lib/utils';
import { SURVEY_EXCLUDED_OBJECT_IDS } from '@/lib/constants';

// Same Survey123 FeatureServer the report pages match against by register —
// here the manager/staff search it directly instead of only auto-matching
// one report's register.
const SURVEY_QUERY_URL =
  'https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer/0/query';

type SurveyRow = {
  objectId: number;
  projectName: string | null;
  organization: string | null;
  reportType: string | null;
  register: string | null;
  projectDate: number | null;
  description: string | null;
};

export default function SurveyLookup() {
  const [register, setRegister] = useState('');
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (reg: string) => {
    setLoading(true);
    setError('');
    try {
      const excludeClause = `OBJECTID NOT IN (${SURVEY_EXCLUDED_OBJECT_IDS.join(',')})`;
      const where = reg
        ? encodeURIComponent(`UPPER(Register) LIKE UPPER('%${reg.replace(/'/g, "''")}%') AND ${excludeClause}`)
        : encodeURIComponent(excludeClause);
      const res = await fetch(`${SURVEY_QUERY_URL}?where=${where}&outFields=*&returnGeometry=false&f=json`);
      const data = await res.json();
      const features = data.features || [];
      setRows(
        features.map((f: any) => ({
          objectId: f.attributes.OBJECTID ?? f.attributes.objectid,
          projectName: f.attributes.project_name ?? null,
          organization: f.attributes.Organization ?? null,
          reportType: f.attributes.Report_type ?? null,
          register: f.attributes.Register ?? null,
          projectDate: f.attributes.Project_date ?? null,
          description: f.attributes.Description ?? null,
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
                  <tr key={row.objectId} className="transition-colors hover:bg-teal-50/40">
                    <td className="px-4 py-4 text-slate-600">{row.reportType || '-'}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{row.projectName || '-'}</td>
                    <td className="px-4 py-4 text-slate-600">{row.organization || '-'}</td>
                    <td className="px-4 py-4 text-slate-600">{row.register || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-slate-600">
                      {row.projectDate ? formatDate(new Date(row.projectDate)) : '-'}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{row.description || '-'}</td>
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
