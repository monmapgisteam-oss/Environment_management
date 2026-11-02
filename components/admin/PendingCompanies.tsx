'use client';

import Link from 'next/link';
import { HiOutlineChatAlt2, HiOutlineDocumentText, HiOutlineShieldCheck } from 'react-icons/hi';
import CompanyApprovalButtons from '@/components/admin/CompanyApprovalButtons';

export type PendingCompany = {
  id: string;
  name: string;
  registerNumber: string;
  createdAt: string;
  rejected: boolean;
  contact: { name: string; email: string; phone: string | null; position: string | null } | null;
  conclusion: { reportId: string; projectName: string | null; conclusionNumber: string | null; fileName: string; fileUrl: string } | null;
};

// Self-registered companies waiting for the review manager, who approves them
// after checking the register number against the conclusion. Others (the
// admin) see the list without the buttons.
export default function PendingCompanies({ companies, canDecide = true }: { companies: PendingCompany[]; canDecide?: boolean }) {
  if (companies.length === 0) return null;
  return (
    <section className="border border-amber-200 bg-white">
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3.5">
        <HiOutlineShieldCheck size={18} className="text-amber-700" />
        <h2 className="text-sm font-semibold text-amber-900">
          Баталгаажуулалт хүлээж буй байгууллага ({companies.filter((company) => !company.rejected).length})
          {companies.some((company) => company.rejected) && ` · татгалзсан ${companies.filter((company) => company.rejected).length}`}
        </h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {companies.map((company) => (
          <li key={company.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                {company.name}
                {company.rejected && <span className="ml-2 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Татгалзсан</span>}
              </p>
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
                  <Link
                    href={`/report/${company.conclusion.reportId}?role=reviewer`}
                    className="ml-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-teal-700"
                  >
                    <HiOutlineChatAlt2 size={14} /> Дэлгэрэнгүй, тайлбар
                  </Link>
                </>
              ) : (
                <p className="text-xs text-slate-400">Дүгнэлт хавсаргаагүй</p>
              )}
            </div>
            {canDecide ? (
              <CompanyApprovalButtons company={company} rejected={company.rejected} />
            ) : (
              <span className="text-xs text-slate-400">Хянах менежер шийднэ</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
