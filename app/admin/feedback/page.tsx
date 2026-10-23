import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import { formatDate } from '@/lib/utils';

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
  const items: typeof rows = [];
  for (const row of rows) {
    const key = `${row.createdAt.getTime()}|${row.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(row);
  }
  return items;
}

export default async function AdminFeedbackPage() {
  const feedback = await fetchFeedback();

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Санал хүсэлт" subtitle="Илгээгч, хянах менежер болон ажилтнуудаас ирсэн санал хүсэлт" />

      {feedback.length === 0 ? (
        <EmptyState title="Санал хүсэлт ирээгүй байна." />
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <div key={f.id} className="border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{f.message}</p>
                <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">{formatDate(f.createdAt.toISOString())}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
