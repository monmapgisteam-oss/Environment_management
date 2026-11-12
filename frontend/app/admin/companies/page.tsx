import PageHeader from '@/components/layout/PageHeader';
import { loadView } from '@/lib/api/server';
import CompaniesView from '@/components/admin/CompaniesView';
import PendingCompanies from '@/components/admin/PendingCompanies';

export default async function AdminCompaniesPage() {
  const { rows, pending } = await loadView('admin/companies');

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Компаниуд" subtitle="Бүх байгууллага болон тэдгээрийн бөглөсөн судалгааны мэдээлэл" />

      <PendingCompanies companies={pending} canDecide={false} />

      <CompaniesView companies={rows} />
    </main>
  );
}
