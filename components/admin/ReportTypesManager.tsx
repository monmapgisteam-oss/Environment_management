'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiPlus } from 'react-icons/hi';

type ReportType = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count: { reports: number };
};

export default function ReportTypesManager({ reportTypes }: { reportTypes: ReportType[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const addType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/report-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Алдаа гарлаа');
        return;
      }
      setName('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rt: ReportType) => {
    setBusyId(rt.id);
    try {
      await fetch(`/api/report-types/${rt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rt.isActive }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const startRename = (rt: ReportType) => {
    setEditingId(rt.id);
    setEditingName(rt.name);
  };

  const saveRename = async (rt: ReportType) => {
    if (!editingName.trim() || editingName.trim() === rt.name) {
      setEditingId(null);
      return;
    }
    setBusyId(rt.id);
    try {
      await fetch(`/api/report-types/${rt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      setEditingId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={addType} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Шинэ тайлангийн төрөл</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Жишээ: Улирлын тайлан"
            className="h-11 w-full flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-6 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:opacity-60"
          >
            <HiPlus size={16} />
            {saving ? 'Нэмж байна...' : 'Нэмэх'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
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
            {reportTypes.map((rt) => (
              <tr key={rt.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-800">
                  {editingId === rt.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveRename(rt)}
                      autoFocus
                      className="h-9 w-full max-w-xs rounded-lg border border-teal-300 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-100"
                    />
                  ) : (
                    rt.name
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
                    {editingId === rt.id ? (
                      <>
                        <button
                          onClick={() => saveRename(rt)}
                          disabled={busyId === rt.id}
                          className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"
                        >
                          Хадгалах
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Цуцлах
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startRename(rt)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Нэр солих
                        </button>
                        <button
                          onClick={() => toggleActive(rt)}
                          disabled={busyId === rt.id}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
