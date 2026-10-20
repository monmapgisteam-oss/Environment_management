import dataStore from '@/lib/db';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { adminNavItems } from '@/lib/adminNav';
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
    <div className="flex min-h-screen bg-background">
      <Sidebar items={adminNavItems('feedback')} role="admin" />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Систем админ" companyName="Системийн удирдлага" role="admin" />
        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Санал хүсэлт</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Илгээгч, хянах менежер болон ажилтнуудаас ирсэн санал хүсэлт
            </p>
          </div>

          {feedback.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-slate-400 shadow-soft">
              Санал хүсэлт ирээгүй байна.
            </div>
          ) : (
            <div className="space-y-3">
              {feedback.map((f) => (
                <div key={f.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{f.message}</p>
                    <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">{formatDate(f.createdAt.toISOString())}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
