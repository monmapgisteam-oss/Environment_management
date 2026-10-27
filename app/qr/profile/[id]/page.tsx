import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { HiBadgeCheck, HiBriefcase, HiExclamation, HiOfficeBuilding, HiPhone } from 'react-icons/hi';
import dataStore from '@/lib/db';

type Props = {
  params: Promise<{ id: string }>;
};

const ROLE_LABEL: Record<string, string> = {
  review_manager: 'Хянах менежер',
  evaluator: 'Үнэлгээний ажилтан',
};

// Public card opened from the QR code on printed evaluations and covers: name,
// role, workplace and work phone. Anyone can open it, so the email and the
// signature PIN are never read here; only whether a signature is registered.
async function fetchQrProfile(id: string) {
  const profile = await dataStore.user.findFirst({
    where: {
      id,
      role: { in: ['review_manager', 'evaluator'] },
    },
    select: {
      name: true,
      role: true,
      phone: true,
      position: true,
      isActive: true,
      signaturePinHash: true,
      company: { select: { name: true } },
    },
  });
  if (!profile) return null;
  const { signaturePinHash, ...publicProfile } = profile;
  return { ...publicProfile, signatureRegistered: !!signaturePinHash };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? 'A').slice(0, 2);
  return letters.toUpperCase();
}

function DetailRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3.5 px-5 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-teal-50 text-teal-700">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <div className="mt-0.5 break-words text-[15px] font-semibold text-slate-900">{children}</div>
      </div>
    </div>
  );
}

export default async function QrProfilePage(props: Props) {
  const params = await props.params;
  const profile = await fetchQrProfile(params.id);

  if (!profile) notFound();

  const roleLabel = ROLE_LABEL[profile.role] || 'Ажилтан';
  const position = profile.position || roleLabel;
  const workplace = profile.company?.name || 'Ажлын газар бүртгэгдээгүй';
  // Older accounts have no isActive value and count as active.
  const active = profile.isActive !== false;
  const verified = active && profile.signatureRegistered;
  const checkedAt = new Date().toLocaleString('mn-MN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ulaanbaatar' });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        {/* Issuer, so whoever scans the code sees where the record comes from */}
        <Link href="/" className="flex items-center gap-3 px-1">
          <img src="/logo.svg" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-800">Нийслэлийн Байгаль орчны газар</span>
            <span className="block truncate text-xs text-slate-500">Байгаль орчны менежментийн төлөвлөгөөний систем</span>
          </span>
        </Link>

        <section className="mt-5 overflow-hidden border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0B5B55] via-[#0F766E] to-[#115E59] px-6 pb-7 pt-6 text-white">
            <img
              src="/logo.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-8 h-44 w-44 opacity-[0.08] grayscale"
            />
            <div className="relative flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center bg-white/15 text-2xl font-bold ring-1 ring-white/30">
                {initials(profile.name)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-100">{roleLabel}</p>
                <h1 className="mt-1 break-words text-[22px] font-bold leading-tight">{profile.name}</h1>
                <p className="mt-0.5 text-sm text-teal-50/90">{position}</p>
              </div>
            </div>
          </div>

          {/* Signature status: what the QR code on the document vouches for */}
          <div
            className={`flex items-start gap-3 border-b px-5 py-4 ${
              verified ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'
            }`}
          >
            {verified ? (
              <HiBadgeCheck size={22} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <HiExclamation size={22} className="mt-0.5 shrink-0 text-amber-600" />
            )}
            <div className="min-w-0">
              <p className={`text-sm font-bold ${verified ? 'text-emerald-800' : 'text-amber-800'}`}>
                {!active ? 'Эрх идэвхгүй болсон ажилтан' : verified ? 'Тоон гарын үсэг идэвхтэй' : 'Тоон гарын үсэг олгогдоогүй'}
              </p>
              <p className={`mt-0.5 text-xs ${verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                {verified
                  ? 'Системээс олгосон тоон гарын үсгээр үнэлгээнд гарын үсэг зурдаг бүртгэлтэй ажилтан.'
                  : 'Энэ ажилтан одоогоор тоон гарын үсгээр баталгаажуулах боломжгүй.'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <DetailRow icon={<HiBriefcase size={18} />} label="Албан тушаал">
              {position}
            </DetailRow>
            <DetailRow icon={<HiOfficeBuilding size={18} />} label="Ажлын газар">
              {workplace}
            </DetailRow>
            {profile.phone && (
              <DetailRow icon={<HiPhone size={18} />} label="Утасны дугаар">
                <a href={`tel:${profile.phone}`} className="hover:text-teal-700">
                  {profile.phone}
                </a>
              </DetailRow>
            )}
          </div>

          {/* One-tap call from the phone that scanned the code */}
          {profile.phone && (
            <div className="border-t border-slate-200 bg-slate-50 p-4">
              <a
                href={`tel:${profile.phone}`}
                className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[#0F766E] text-sm font-semibold text-white transition hover:bg-[#115E59]"
              >
                <HiPhone size={16} /> Залгах
              </a>
            </div>
          )}
        </section>

        <p className="mt-4 px-1 text-center text-[11px] leading-5 text-slate-500">
          Мэдээллийг системээс шалгасан: {checkedAt}
        </p>
      </div>
    </main>
  );
}
