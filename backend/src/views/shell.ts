import dataStore from '@/lib/db';
import { VIEWER_ROLE } from '@/lib/auth/session';
import { defineView } from './define';

// The signed-in page frame: reviewer and staff menus list the active report
// types as a submenu.
export default defineView({
  name: 'shell',
  roles: [],
  async load({ user }) {
    const role = VIEWER_ROLE[user.role];
    if (role !== 'reviewer' && role !== 'staff') return { reportTypes: [] };
    const reportTypes = await dataStore.reportType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    return { reportTypes: reportTypes.map(({ id, name, slug }) => ({ id, name, slug })) };
  },
});
