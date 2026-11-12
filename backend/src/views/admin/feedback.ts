import dataStore from '@/lib/db';
import { defineView } from '../define';

// "Санал хүсэлт" — feedback senders/staff/managers send via the sidebar
// button (POST /api/support). It lands as a Notification with reportId
// null and title "Санал хүсэлт", addressed to every admin, so we dedupe by
// message+timestamp before listing it here.
async function fetchFeedback() {
  const rows = await dataStore.notification.findMany({
    where: { reportId: null, title: 'Санал хүсэлт' },
    orderBy: { createdAt: 'desc' },
  });

  const seen = new Set<string>();
  const items: { id: string; message: string; createdAt: Date }[] = [];
  for (const row of rows) {
    const key = `${row.createdAt.getTime()}|${row.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ id: row.id, message: row.message, createdAt: row.createdAt });
  }
  return items;
}

export default defineView({
  name: 'admin/feedback',
  roles: ['admin'],
  async load() {
    return { feedback: await fetchFeedback() };
  },
});
