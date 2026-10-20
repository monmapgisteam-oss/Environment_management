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

  const rows: UserRow[] = users.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    position: u.position,
    role: u.role,
    company: u.company ? { name: u.company.name, registerNumber: u.company.registerNumber } : null,
  }));

  return (
    <main className="flex-1 min-w-0 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Хэрэглэгчид</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Илгээгч, хянах менежер болон ажилтны бүх хэрэглэгчийн мэдээлэл
        </p>
      </div>

      <UsersView users={rows} />
    </main>
  );
}
