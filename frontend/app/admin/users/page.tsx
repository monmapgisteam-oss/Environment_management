import PageHeader from '@/components/layout/PageHeader';
import { loadView } from '@/lib/api/server';
import UsersView from '@/components/admin/UsersView';

export default async function AdminUsersPage() {
  // Every non-admin account; whether a signature PIN exists, never its hash.
  const { users: rows } = await loadView('admin/users');

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Хэрэглэгчид" subtitle="Илгээгч, хянах менежер болон ажилтны бүх хэрэглэгч. Хянах байгууллагын ажилтны эрхийг эндээс үүсгэж, идэвхгүй болгоно." />

      <UsersView users={rows} />
    </main>
  );
}
