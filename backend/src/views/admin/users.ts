import dataStore from '@/lib/db';
import type { AdminUserRow } from '@shared/views/admin';
import { defineView } from '../define';

async function fetchUsers() {
  return dataStore.user.findMany({
    where: { role: { not: 'admin' } },
    include: {
      company: { select: { id: true, name: true, registerNumber: true, approvalStatus: true } },
      evaluatorAssignments: { select: { status: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export default defineView({
  name: 'admin/users',
  roles: ['admin'],
  async load() {
    const users = await fetchUsers();

    const rows: AdminUserRow[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      position: u.position,
      role: u.role,
      company: u.company
        ? { id: u.company.id, name: u.company.name, registerNumber: u.company.registerNumber, approvalStatus: u.company.approvalStatus }
        : null,
      isActive: u.isActive !== false,
      mustChangePassword: !!u.mustChangePassword,
      // Only whether one exists; the hash never leaves the server.
      hasSignature: !!u.signaturePinHash,
      // Reports still waiting for this member's score, for the deactivate warning.
      openAssignments: u.evaluatorAssignments.filter((a) => a.status !== 'submitted').length,
    }));
    return { users: rows };
  },
});
