'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiOutlineDocumentText, HiOutlineShieldCheck } from 'react-icons/hi';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';

export type PendingCompany = {
  id: string;
  name: string;
  registerNumber: string;
  createdAt: string;
  contact: { name: string; email: string; phone: string | null; position: string | null } | null;
  conclusion: { projectName: string | null; conclusionNumber: string | null; fileName: string; fileUrl: string } | null;
};

// Self-registered companies waiting for the admin. Approve after checking the
// register number belongs to the organisation (e.g. against the conclusion).
export default function PendingCompanies({ companies }: { companies: PendingCompany[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (company: PendingCompany, action: 'approve' | 'reject') => {
    if (action === 'reject') {
      const ok = await confirmDialog({
        title: 'Бүртгэлийг татгалзах',
        message: `${company.name} (РД ${company.registerNumber}) нэвтрэх боломжгүй хэвээр үлдэнэ. Дараа нь баталгаажуулж болно.`,
        confirmLabel: 'Татгалзах',
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(company.id);
    try {
      const res = await fetch(`/api/admin/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast(action === 'approve' ? `${company.name} баталгаажлаа.` : `${company.name}-ийн бүртгэлийг татгалзлаа.`);
      router.refresh();
    } catch (error) {
      toast((error as Error).message || 'Хадгалахад алдаа гарлаа.', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (companies.length === 0) return null;
  return (
    <section className="border border-amber-200 bg-white">
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3.5">
        <HiOutlineShieldCheck size={18} className="text-amber-700" />
        <h2 className="text-sm font-semibold text-amber-900">Баталгаажуулалт хүлээж буй байгууллага ({companies.length})</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {companies.map((company) => (
          <li key={company.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{company.name}</p>
              <p className="text-xs text-slate-500">
                РД <span className="font-mono font-semibold text-slate-700">{company.registerNumber}</span> · бүртгүүлсэн{' '}
                {new Date(company.createdAt).toLocaleDateString('mn-MN')}
              </p>
              {company.contact && (
                <p className="mt-1 text-xs text-slate-600">
                  {company.contact.name}
                  {company.contact.position ? `, ${company.contact.position}` : ''} · {company.contact.email}
                  {company.contact.phone ? ` · ${company.contact.phone}` : ''}
                </p>
              )}
            </div>
            <div className="min-w-0 text-sm">
              {company.conclusion ? (
                <>
                  <p className="truncate text-slate-700">
                    Дүгнэлт {company.conclusion.conclusionNumber ? `№${company.conclusion.conclusionNumber}` : ''} ·{' '}
                    {company.conclusion.projectName}
                  </p>
                  <a
                    href={company.conclusion.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline"
                  >
                    <HiOutlineDocumentText size={14} className="shrink-0" />
                    <span className="truncate">{company.conclusion.fileName}</span>
                  </a>
                </>
              ) : (
                <p className="text-xs text-slate-400">Дүгнэлт хавсаргаагүй</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => decide(company, 'reject')}
                disabled={busy === company.id}
                className="h-9 border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                Татгалзах
              </button>
              <button
                type="button"
                onClick={() => decide(company, 'approve')}
                disabled={busy === company.id}
                className="h-9 bg-[#0F766E] px-4 text-xs font-semibold text-white hover:bg-[#115E59] disabled:opacity-50"
              >
                Баталгаажуулах
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
