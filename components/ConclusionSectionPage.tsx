import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ConclusionSearchResults from '@/components/ConclusionSearchResults';
import type { ConclusionRow, ConclusionSearchParams } from '@/lib/conclusions';

type SidebarItem = {
  label: string;
  href: string;
  active?: boolean;
  children?: SidebarItem[];
};

type Props = {
  rows: ConclusionRow[];
  search: ConclusionSearchParams;
  role: 'reviewer' | 'staff';
  sidebarItems: SidebarItem[];
  userName: string;
  headerRole?: 'reviewer' | 'staff';
};

export default function ConclusionSectionPage({
  rows,
  search,
  role,
  sidebarItems,
  userName,
  headerRole,
}: Props) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={sidebarItems} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          userName={userName}
          companyName="Хянах байгууллага"
          role={headerRole}
          companyType="reviewer"
        />
        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ерөнхий үнэлгээний дүгнэлт</h1>
            <p className="text-sm text-slate-500">Илгээгч байгууллагуудаас ирсэн ерөнхий үнэлгээний дүгнэлтүүд.</p>
          </div>

          <ConclusionSearchResults rows={rows} search={search} role={role} />
        </main>
      </div>
    </div>
  );
}
