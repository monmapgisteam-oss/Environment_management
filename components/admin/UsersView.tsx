'use client';

import { useMemo, useState } from 'react';
import { HiSearch, HiUser, HiMail, HiPhone, HiOfficeBuilding } from 'react-icons/hi';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  role: string;
  company: { name: string; registerNumber: string } | null;
};

const ROLE_LABELS: Record<string, string> = {
  sender: 'Илгээгч',
  review_manager: 'Хянах менежер',
  evaluator: 'Ажилтан',
  admin: 'Админ',
};

const ROLE_BADGE: Record<string, string> = {
  sender: 'badge-blue',
  review_manager: 'badge-purple',
  evaluator: 'badge-green',
  admin: 'badge-gray',
};

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100';

export default function UsersView({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [role, setRole] = useState('');

  const visible = useMemo(() => {
    const term = applied.trim().toLowerCase();
    return users.filter((u) => {
      if (role && u.role !== role) return false;
      if (!term) return true;
      return (
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.company?.name.toLowerCase().includes(term) ?? false)
      );
    });
  }, [users, applied, role]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    users.forEach((u) => { c[u.role] = (c[u.role] ?? 0) + 1; });
    return c;
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <span className="text-sm font-medium text-slate-600">Нийт хэрэглэгч</span>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 shadow-soft">
          <span className="text-sm font-medium text-slate-600">Илгээгч</span>
          <p className="mt-3 text-3xl font-bold tracking-tight text-blue-600">{counts.sender ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5 shadow-soft">
          <span className="text-sm font-medium text-slate-600">Хянах менежер</span>
          <p className="mt-3 text-3xl font-bold tracking-tight text-violet-600">{counts.review_manager ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-soft">
          <span className="text-sm font-medium text-slate-600">Ажилтан</span>
          <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-600">{counts.evaluator ?? 0}</p>
        </div>
      </section>

      {/* Filter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Хайлт</label>
            <div className="relative">
              <HiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setApplied(search); }}
                placeholder="Нэр, имэйл, байгууллагын нэр"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Төрөл</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
              <option value="">Бүгд</option>
              <option value="sender">Илгээгч</option>
              <option value="review_manager">Хянах менежер</option>
              <option value="evaluator">Ажилтан</option>
              <option value="admin">Админ</option>
            </select>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setApplied(search)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-5 text-sm font-semibold text-white transition hover:bg-[#115E59]"
            >
              <HiSearch size={16} />
              Шүүх
            </button>
            <button
              type="button"
              onClick={() => { setSearch(''); setApplied(''); setRole(''); }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Цэвэрлэх
            </button>
          </div>
        </div>
      </div>

      {/* Users table */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-slate-400 shadow-soft">
          Хэрэглэгч олдсонгүй.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-teal-50/50 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-4 py-3">Нэр</th>
                  <th className="px-4 py-3">Имэйл</th>
                  <th className="px-4 py-3">Утас</th>
                  <th className="px-4 py-3">Албан тушаал</th>
                  <th className="px-4 py-3">Төрөл</th>
                  <th className="px-4 py-3">Байгууллага</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-teal-50/40">
                    <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <HiUser size={14} className="text-slate-400" />
                        {u.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <HiMail size={14} className="text-slate-400" />
                        {u.email}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {u.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <HiPhone size={14} className="text-slate-400" />
                          {u.phone}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{u.position || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${ROLE_BADGE[u.role] ?? 'badge-gray'}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {u.company ? (
                        <span className="inline-flex items-center gap-1.5">
                          <HiOfficeBuilding size={14} className="text-slate-400" />
                          {u.company.name}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
