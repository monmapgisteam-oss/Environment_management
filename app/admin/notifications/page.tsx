import PageHeader from '@/components/layout/PageHeader';
import BroadcastForm from '@/components/admin/BroadcastForm';
import dataStore from '@/lib/db';
import { ACTIVE_USER_WHERE } from '@/lib/auth/accounts';
import { BROADCAST_AUDIENCES, audienceLabel } from '@/lib/notifications/broadcast';
import { formatDate } from '@/lib/utils';

export default async function AdminNotificationsPage() {
  const [users, broadcasts] = await Promise.all([
    dataStore.user.findMany({ where: { role: { not: 'admin' }, ...ACTIVE_USER_WHERE }, select: { role: true } }),
    dataStore.broadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);
  // How many active users each audience reaches, shown before sending.
  const counts = Object.fromEntries(
    BROADCAST_AUDIENCES.map((option) => [option.value, users.filter((user) => option.roles.includes(user.role)).length]),
  );

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader
        title="Мэдэгдэл илгээх"
        subtitle="Бүх хэрэглэгч эсвэл сонгосон бүлэгт системийн мэдэгдэл илгээнэ. Хэрэглэгчийн дээд талын хонхонд харагдана."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <BroadcastForm counts={counts} />

        <section className="border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-900">Илгээсэн мэдэгдлүүд</h2>
          {broadcasts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Одоогоор мэдэгдэл илгээгээгүй байна.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {broadcasts.map((broadcast) => (
                <li key={broadcast.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{broadcast.title}</p>
                    <span className="shrink-0 text-xs text-slate-500">{formatDate(broadcast.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{broadcast.message}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {audienceLabel(broadcast.audience)} · {broadcast.recipientCount} хүн · {broadcast.sentByName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
