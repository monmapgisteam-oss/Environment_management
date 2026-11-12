import dataStore from '@/lib/db';
import { defineView } from '../define';

export default defineView({
  name: 'admin/settings',
  roles: ['admin'],
  async load() {
    const reportTypes = await dataStore.reportType.findMany({
      include: { _count: { select: { reports: true } } },
      orderBy: { name: 'asc' },
    });
    return { reportTypes };
  },
});
