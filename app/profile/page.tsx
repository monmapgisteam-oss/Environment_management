import Link from 'next/link';
import { requireUser, ROLE_HOME } from '@/lib/auth';
import { createQrImageUrl, getPublicProfileQrUrl } from '@/lib/auth/profileQr';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Систем админ',
  sender: 'Илгээгч',
  review_manager: 'Хянах менежер',
  evaluator: 'Үнэлгээний ажилтан',
};

export default async function ProfilePage() {
  const user = await requireUser();

  const workplace = user.company?.name || 'Ажлын газар бүртгэгдээгүй';
  const position = user.position || '-';
  const phone = user.phone || '-';
  const homeHref = ROLE_HOME[user.role];
  const showQrCode = user.role === 'review_manager' || user.role === 'evaluator';
  const qrProfileUrl = await getPublicProfileQrUrl(user.id);
  const qrUrl = await createQrImageUrl(qrProfileUrl);

  return (
    <main className="w-full px-5 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Бүртгэл</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Хувийн мэдээлэл</h1>
          </div>
          <Link
            href={homeHref}
            className="inline-flex h-10 items-center justify-center border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Буцах
          </Link>
        </div>

        <section className="overflow-hidden border border-slate-200 bg-white shadow-soft">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-slate-100 text-slate-400">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-900">{user.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{ROLE_LABEL[user.role] || user.role}</p>
            </div>
          </div>

          <div className={`grid gap-0 ${showQrCode ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
            <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Нэр</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{user.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Албан тушаал</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{position}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ажлын газар</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{workplace}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Утасны дугаар</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{phone}</p>
              </div>
            </div>

            {showQrCode && (
              <div className="border-t border-slate-100 bg-slate-50 px-6 py-6 lg:border-l lg:border-t-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">QR код</p>
                <div className="mt-4 flex flex-col items-start gap-4">
                  <img
                    src={qrUrl}
                    alt="Хувийн мэдээлэл агуулсан QR код"
                    className="h-[220px] w-[220px] border border-slate-200 bg-white p-3 shadow-sm"
                  />
                  <p className="text-sm leading-6 text-slate-500">
                    QR код нь нэр, албан тушаал, ажлын газар, утасны дугаар бүхий хуудас руу холбоно.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
