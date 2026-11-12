'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CORE_TYPE_SLUGS } from '@shared/reports/terms';

type ReportType = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count: { reports: number };
};

// The two core types (plan, performance report) are fixed: every form, sheet
// and list depends on them. Other types, such as old Survey123 ones, can only
// be renamed or switched on and off. New types can't be added: nothing in the
// workflow could submit or score them.
export default function ReportTypesManager({ reportTypes }: { reportTypes: ReportType[] }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const patch = async (rt: ReportType, body: Record<string, unknown>) => {
    setBusyId(rt.id);
    setError('');
    try {
      const res = await fetch(`/api/report-types/${rt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Хадгалахад алдаа гарлаа.');
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError('Сүлжээний алдаа гарлаа. Дахин оролдоно уу.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = (rt: ReportType) => patch(rt, { isActive: !rt.isActive });

  const startRename = (rt: ReportType) => {
    setEditingId(rt.id);
    setEditingName(rt.name);
  };

  const saveRename = async (rt: ReportType) => {
    if (!editingName.trim() || editingName.trim() === rt.name) {
      setEditingId(null);
      return;
    }
    if (await patch(rt, { name: editingName.trim() })) setEditingId(null);
  };

  return (
    <div className="space-y-5">
      {error && <p className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

      <div className="overflow-hidden border border-slate-200 bg-white shadow-soft">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Нэр</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-28">Тайлангийн тоо</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-32">Төлөв</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-40">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {reportTypes.map((rt) => {
              const core = CORE_TYPE_SLUGS.includes(rt.slug);
              return (
              <tr key={rt.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-800">
                  {editingId === rt.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveRename(rt)}
                      autoFocus
                      className="h-9 w-full max-w-xs border border-teal-300 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-100"
                    />
                  ) : (
                    <>
                      {rt.name}
                      {core && <span className="ml-2 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">Үндсэн төрөл</span>}
                    </>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-medium text-slate-600">{rt._count.reports}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium ${rt.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {rt.isActive ? 'Идэвхтэй' : 'Идэвхгүй'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-2">
                    {core ? (
                      <span className="text-xs text-slate-400">Өөрчлөх боломжгүй</span>
                    ) : editingId === rt.id ? (
                      <>
                        <button
                          onClick={() => saveRename(rt)}
                          disabled={busyId === rt.id}
                          className="border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"
                        >
                          Хадгалах
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Цуцлах
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startRename(rt)}
                          className="border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Нэр солих
                        </button>
                        <button
                          onClick={() => toggleActive(rt)}
                          disabled={busyId === rt.id}
                          className={` border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                            rt.isActive
                              ? 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                              : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {rt.isActive ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
