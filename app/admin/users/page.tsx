import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import UsersView, { type UserRow } from '@/components/admin/UsersView';

async function fetchUsers() {
  return dataStore.user.findMany({
    where: { role: { not: 'admin' } },
    include: { company: { select: { name: true, registerNumber: true } } },
    orderBy: { name: 'asc' },
  });
}

export default async function AdminUsersPage() {
  const users = await fetchUsers();

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    position: u.position,
    role: u.role,
    company: u.company ? { name: u.company.name, registerNumber: u.company.registerNumber } : null,
  }));

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Хэрэглэгчид" subtitle="Илгээгч, хянах менежер болон ажилтны бүх хэрэглэгчийн мэдээлэл" />

      <UsersView users={rows} />
    </main>
  );
}
