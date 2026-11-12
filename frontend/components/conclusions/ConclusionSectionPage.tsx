import type { ReactNode } from 'react';
import ConclusionSearchResults from '@/components/conclusions/ConclusionSearchResults';
import type { ConclusionRow, ConclusionSearchParams } from '@shared/reports/conclusions';

type Props = {
  rows: ConclusionRow[];
  search: ConclusionSearchParams;
  role: 'reviewer' | 'staff';
  // Shown above the list (the manager's new registrations to approve).
  children?: ReactNode;
};

export default function ConclusionSectionPage({
  rows,
  search,
  role,
  children,
}: Props) {
  return (
    <main className="flex-1 min-w-0 space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ерөнхий үнэлгээний дүгнэлт</h1>
        <p className="text-sm text-slate-500">Илгээгч байгууллагуудаас ирсэн ерөнхий үнэлгээний дүгнэлтүүд.</p>
      </div>

      {children}

      <ConclusionSearchResults rows={rows} search={search} role={role} />
    </main>
  );
}
