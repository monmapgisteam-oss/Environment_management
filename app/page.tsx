import Link from 'next/link';
import { LuShieldCheck, LuSend, LuFileSearch, LuUserCog } from 'react-icons/lu';
import OrgLoginCard from '@/components/OrgLoginCard';
import {
  SENDER_ACCOUNTS,
  REVIEWER_ACCOUNTS,
  SENDER_ROLES,
  REVIEWER_ROLES,
} from '@/lib/constants';

function BackgroundDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft blurred circles */}
      <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-sky-400/25 blur-3xl" />
      <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />

      {/* Dotted patterns */}
      <svg className="absolute left-10 top-16 h-40 w-40 text-white/25" aria-hidden="true">
        <defs>
          <pattern id="dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
      <svg className="absolute bottom-24 right-16 h-40 w-40 text-white/20" aria-hidden="true">
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Soft wave at the bottom */}
      <svg
        className="absolute bottom-0 left-0 w-full text-white/10"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,229.3C960,213,1056,171,1152,165.3C1248,160,1344,192,1392,208L1440,224L1440,320L0,320Z"
        />
      </svg>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-700 px-4 py-12">
      <BackgroundDecorations />

      {/* Main glass panel */}
      <div className="relative z-10 w-full max-w-[1180px] rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-[0_30px_80px_rgba(8,38,74,0.25)] backdrop-blur-xl sm:p-12 lg:p-16">
        {/* Top section */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-500/30">
            <LuShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#08264A] sm:text-4xl">
            Тайлан илгээх, үнэлгээ өгөх систем
          </h1>
          <p className="mt-3 text-base text-slate-500">Та нэвтрэх төрлөө сонгоно уу</p>
        </div>

        {/* Cards — each organisation lists its accounts; one click logs in. */}
        <div className="mx-auto mt-12 grid max-w-3xl items-start gap-8 md:grid-cols-2">
          <OrgLoginCard
            title="Тайлан илгээх байгууллага"
            subtitle="Байгууллагаа сонгож нэвтэрнэ үү."
            icon={<LuSend size={34} />}
            accounts={SENDER_ACCOUNTS}
            allowedRoles={SENDER_ROLES}
          />
          <OrgLoginCard
            title="Тайлан хянах байгууллага"
            subtitle="Аккаунтаа сонгож нэвтэрнэ үү."
            icon={<LuFileSearch size={34} />}
            accounts={REVIEWER_ACCOUNTS}
            allowedRoles={REVIEWER_ROLES}
          />
        </div>

        {/* Admin link */}
        <div className="mt-10 text-center">
          <Link
            href="/login/admin"
            className="group inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
          >
            <LuUserCog size={16} />
            <span className="group-hover:underline">Системийн админ нэвтрэх</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
