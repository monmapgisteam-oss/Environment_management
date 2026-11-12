import dataStore from '@/lib/db';
import { ACTIVE_USER_WHERE } from '@shared/auth/accounts';
import { BROADCAST_AUDIENCES } from '@shared/notifications/broadcast';
import { defineView } from '../define';

export default defineView({
  name: 'admin/notifications',
  roles: ['admin'],
  async load() {
    const [users, broadcasts] = await Promise.all([
      dataStore.user.findMany({ where: { role: { not: 'admin' }, ...ACTIVE_USER_WHERE }, select: { role: true } }),
      dataStore.broadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    ]);
    // How many active users each audience reaches, shown before sending.
    const counts: Record<string, number> = Object.fromEntries(
      BROADCAST_AUDIENCES.map((option) => [option.value, users.filter((user) => option.roles.includes(user.role)).length]),
    );
    return { counts, broadcasts };
  },
});
