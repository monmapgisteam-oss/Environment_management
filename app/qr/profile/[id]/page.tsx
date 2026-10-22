import { notFound } from 'next/navigation';
import { HiBriefcase, HiOfficeBuilding, HiPhone, HiShieldCheck } from 'react-icons/hi';
import QrSignatureReveal from '@/components/signature/QrSignatureReveal';
import dataStore from '@/lib/db';

type Props = {
  params: Promise<{ id: string }>;
};

const ROLE_LABEL: Record<string, string> = {
  review_manager: 'Хянах менежер',
  evaluator: 'Үнэлгээний ажилтан',
};

// Public card: name, role, workplace and phone. The signature PIN is a secret
// and is never read here; only whether one is registered.
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
      signaturePinHash: true,
      company: { select: { name: true } },
    },
  });
  if (!profile) return null;
  const { signaturePinHash, ...publicProfile } = profile;
  return { ...publicProfile, signatureRegistered: !!signaturePinHash };
}

export default async function QrProfilePage(props: Props) {
  const params = await props.params;
  const profile = await fetchQrProfile(params.id);

  if (!profile) notFound();

  const workplace = profile.company?.name || 'Ажлын газар бүртгэгдээгүй';
  const position = profile.position || ROLE_LABEL[profile.role] || 'Ажилтан';
  const phone = profile.phone || '-';
  const initial = profile.name.trim().charAt(0) || 'A';

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-md flex-col justify-center">
        <div className="overflow-hidden border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
          <div className="bg-[#0F766E] px-6 pb-16 pt-7 text-white">
            <div className="inline-flex items-center gap-2 bg-white/12 px-3 py-1.5 text-xs font-semibold">
              <HiShieldCheck size={16} />
              Баталгаажсан ажилтан
            </div>
          </div>

          <div className="-mt-11 px-6 pb-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-slate-900 text-4xl font-bold text-white shadow-lg">
              {initial}
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-[#0F766E]">{ROLE_LABEL[profile.role] || profile.role}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{profile.name}</h1>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <HiBriefcase className="mt-0.5 shrink-0 text-[#0F766E]" size={20} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Албан тушаал</p>
                  <p className="mt-1 break-words text-base font-semibold text-slate-900">{position}</p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <HiOfficeBuilding className="mt-0.5 shrink-0 text-[#0F766E]" size={20} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ажлын газар</p>
                  <p className="mt-1 break-words text-base font-semibold text-slate-900">{workplace}</p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <HiPhone className="mt-0.5 shrink-0 text-[#0F766E]" size={20} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Утасны дугаар</p>
                  {profile.phone ? (
                    <a className="mt-1 inline-block break-words text-base font-semibold text-slate-900" href={`tel:${profile.phone}`}>
                      {phone}
                    </a>
                  ) : (
                    <p className="mt-1 text-base font-semibold text-slate-900">{phone}</p>
                  )}
                </div>
              </div>

              <QrSignatureReveal registered={profile.signatureRegistered} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
