'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { HiArrowDown, HiArrowUp, HiCheck, HiPencil, HiPlus, HiTrash, HiX } from 'react-icons/hi';
import { toast } from '@/lib/toast';

export type AdminCriterion = {
  id: string;
  name: string;
  category: string | null;
  maxScore: number;
  sortOrder: number;
  isActive: boolean;
  scoreCount: number;
};

type Sheet = { category: string; criteria: AdminCriterion[] };

const TARGET_TOTAL = 100;

const inputClass =
  'h-9 w-full border border-slate-200 bg-white px-2.5 text-sm text-slate-800 focus:border-color-primary focus:outline-none focus:ring-2 focus:ring-color-primary/10';
const iconButton =
  'flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500 transition hover:border-color-primary hover:text-color-primary disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-500';

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Алдаа гарлаа');
  }
}

// Admin editor for the scoring sheets: one table per report category with
// inline edit, reorder, add, deactivate and delete.
export default function CriteriaManager({ sheets }: { sheets: Sheet[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', maxScore: '' });
  const [adding, setAdding] = useState<string | null>(null);
  const [newRow, setNewRow] = useState({ name: '', maxScore: '' });

  const run = async (id: string, action: () => Promise<void>, done = 'Хадгалагдлаа.') => {
    setBusyId(id);
    setError('');
    try {
      await action();
      toast(done);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Алдаа гарлаа');
      toast(e instanceof Error ? e.message : 'Алдаа гарлаа', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (c: AdminCriterion) => {
    setEditingId(c.id);
    setDraft({ name: c.name, maxScore: String(c.maxScore) });
  };

  const saveEdit = (c: AdminCriterion) =>
    run(c.id, async () => {
      await send(`/api/criteria/${c.id}`, 'PATCH', { name: draft.name, maxScore: Number(draft.maxScore) });
      setEditingId(null);
    });

  // Swap sort orders with the neighbour; two small updates.
  const move = (sheet: Sheet, index: number, direction: -1 | 1) => {
    const a = sheet.criteria[index];
    const b = sheet.criteria[index + direction];
    if (!a || !b) return;
    return run(a.id, async () => {
      await send(`/api/criteria/${a.id}`, 'PATCH', { sortOrder: b.sortOrder });
      await send(`/api/criteria/${b.id}`, 'PATCH', { sortOrder: a.sortOrder });
    });
  };

  const toggleActive = (c: AdminCriterion) =>
    run(c.id, () => send(`/api/criteria/${c.id}`, 'PATCH', { isActive: !c.isActive }));

  const remove = (c: AdminCriterion) => {
    if (!window.confirm(`"${c.name}" шалгуурыг устгах уу?`)) return;
    return run(c.id, () => send(`/api/criteria/${c.id}`, 'DELETE'), 'Шалгуур устгагдлаа.');
  };

  const add = (event: FormEvent, category: string) => {
    event.preventDefault();
    return run(`add:${category}`, async () => {
      await send('/api/criteria', 'POST', { category, name: newRow.name, maxScore: Number(newRow.maxScore) });
      setNewRow({ name: '', maxScore: '' });
      setAdding(null);
    });
  };

  return (
    <div className="space-y-6">
      {error && <p className="border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}

      {sheets.map((sheet) => {
        const active = sheet.criteria.filter((c) => c.isActive);
        const total = active.reduce((sum, c) => sum + c.maxScore, 0);
        const totalOk = total === TARGET_TOTAL;
        return (
          <section key={sheet.category} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">{sheet.category}</h2>
              <span className={`text-xs font-medium ${totalOk ? 'text-slate-500' : 'text-rose-600'}`}>
                {totalOk ? `Нийт ${TARGET_TOTAL} оноо` : `Нийт ${total} оноо — ${TARGET_TOTAL} байх ёстой`}
              </span>
            </div>
            <div className="overflow-x-auto border border-slate-200 bg-white shadow-soft">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <th className="w-12 px-4 py-3">№</th>
                    <th className="px-4 py-3">Шалгуур</th>
                    <th className="w-32 px-4 py-3 text-center">Авбал зохих оноо</th>
                    <th className="w-24 px-4 py-3 text-center">Төлөв</th>
                    <th className="w-52 px-4 py-3 text-right">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.criteria.map((c, index) => {
                    const busy = busyId === c.id;
                    const editing = editingId === c.id;
                    return (
                      <tr key={c.id} className={`border-b border-slate-100 ${c.isActive ? '' : 'bg-slate-50 text-slate-400'}`}>
                        <td className="px-4 py-2.5 text-slate-500">{index + 1}</td>
                        <td className="px-4 py-2.5">
                          {editing ? (
                            <input
                              autoFocus
                              value={draft.name}
                              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                              className={inputClass}
                            />
                          ) : (
                            <>
                              <span className={c.isActive ? 'text-slate-800' : 'line-through'}>{c.name}</span>
                              {c.scoreCount > 0 && (
                                <span className="ml-2 text-xs text-slate-400">{c.scoreCount} үнэлгээнд ашигласан</span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center font-semibold">
                          {editing ? (
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={draft.maxScore}
                              onChange={(e) => setDraft({ ...draft, maxScore: e.target.value })}
                              className={`${inputClass} w-20 text-center`}
                            />
                          ) : (
                            c.maxScore
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => toggleActive(c)}
                            className={`px-2 py-0.5 text-xs font-semibold ${
                              c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {c.isActive ? 'Идэвхтэй' : 'Идэвхгүй'}
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            {editing ? (
                              <>
                                <button type="button" disabled={busy} onClick={() => saveEdit(c)} className={iconButton} title="Хадгалах">
                                  <HiCheck size={16} />
                                </button>
                                <button type="button" onClick={() => setEditingId(null)} className={iconButton} title="Болих">
                                  <HiX size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" disabled={busy || index === 0} onClick={() => move(sheet, index, -1)} className={iconButton} title="Дээш">
                                  <HiArrowUp size={15} />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || index === sheet.criteria.length - 1}
                                  onClick={() => move(sheet, index, 1)}
                                  className={iconButton}
                                  title="Доош"
                                >
                                  <HiArrowDown size={15} />
                                </button>
                                <button type="button" disabled={busy} onClick={() => startEdit(c)} className={iconButton} title="Засах">
                                  <HiPencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || c.scoreCount > 0}
                                  onClick={() => remove(c)}
                                  className={iconButton}
                                  title={c.scoreCount > 0 ? 'Оноо өгсөн тул устгах боломжгүй' : 'Устгах'}
                                >
                                  <HiTrash size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {adding === sheet.category ? (
                    <tr className="border-b border-slate-100 bg-teal-50/40">
                      <td className="px-4 py-2.5 text-slate-400">+</td>
                      <td className="px-4 py-2.5">
                        <input
                          autoFocus
                          form={`add-${sheet.category}`}
                          required
                          placeholder="Шалгуурын нэр"
                          value={newRow.name}
                          onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          form={`add-${sheet.category}`}
                          required
                          type="number"
                          min={1}
                          max={100}
                          placeholder="Оноо"
                          value={newRow.maxScore}
                          onChange={(e) => setNewRow({ ...newRow, maxScore: e.target.value })}
                          className={`${inputClass} w-20 text-center`}
                        />
                      </td>
                      <td />
                      <td className="px-4 py-2.5">
                        <form id={`add-${sheet.category}`} onSubmit={(e) => add(e, sheet.category)} className="flex justify-end gap-1.5">
                          <button type="submit" disabled={busyId === `add:${sheet.category}`} className={iconButton} title="Нэмэх">
                            <HiCheck size={16} />
                          </button>
                          <button type="button" onClick={() => setAdding(null)} className={iconButton} title="Болих">
                            <HiX size={16} />
                          </button>
                        </form>
                      </td>
                    </tr>
                  ) : null}
                  <tr className="border-t-2 border-slate-300 bg-slate-50">
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 font-bold text-slate-900">Нийт оноо</td>
                    <td className={`px-4 py-3 text-center font-bold ${totalOk ? 'text-slate-900' : 'text-rose-600'}`}>{total}</td>
                    <td />
                    <td className="px-4 py-3 text-right">
                      {adding !== sheet.category && (
                        <button
                          type="button"
                          onClick={() => {
                            setAdding(sheet.category);
                            setNewRow({ name: '', maxScore: '' });
                          }}
                          className="inline-flex h-8 items-center gap-1.5 bg-color-primary px-3 text-xs font-semibold text-white hover:bg-color-primary-dark"
                        >
                          <HiPlus size={14} /> Шалгуур нэмэх
                        </button>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
