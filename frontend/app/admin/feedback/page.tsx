import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/layout/PageHeader';
import { loadView } from '@/lib/api/server';
import { formatDate } from '@shared/utils';

export default async function AdminFeedbackPage() {
  // Feedback senders/staff/managers send via the sidebar button, one entry per
  // message (it is addressed to every admin).
  const { feedback } = await loadView('admin/feedback');

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
