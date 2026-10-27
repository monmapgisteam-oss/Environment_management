import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import UsersView, { type UserRow } from '@/components/admin/UsersView';

async function fetchUsers() {
  return dataStore.user.findMany({
    where: { role: { not: 'admin' } },
    include: {
      company: { select: { name: true, registerNumber: true } },
      evaluatorAssignments: { select: { status: true } },
    },
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
    isActive: u.isActive !== false,
    mustChangePassword: !!u.mustChangePassword,
    // Only whether one exists; the hash never leaves the server.
    hasSignature: !!u.signaturePinHash,
    // Reports still waiting for this member's score, for the deactivate warning.
    openAssignments: u.evaluatorAssignments.filter((a) => a.status !== 'submitted').length,
  }));

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Хэрэглэгчид" subtitle="Илгээгч, хянах менежер болон ажилтны бүх хэрэглэгч. Хянах байгууллагын ажилтны эрхийг эндээс үүсгэж, идэвхгүй болгоно." />

      <UsersView users={rows} />
    </main>
  );
}
