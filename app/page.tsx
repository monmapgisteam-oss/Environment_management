import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuShieldCheck, LuSend, LuFileSearch, LuUserCog, LuArrowRight } from 'react-icons/lu';

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

function RoleCard({ href, title, icon }: { href: string; title: string; icon: ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col items-center rounded-[28px] border border-sky-100 bg-gradient-to-b from-white to-sky-50/40 px-8 py-10 text-center shadow-[0_8px_30px_rgba(2,132,199,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-300 hover:shadow-[0_18px_45px_rgba(2,132,199,0.18)]"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-500/25 transition-transform duration-300 group-hover:scale-105">
        {icon}
      </div>

      <h3 className="mt-6 text-xl font-bold text-[#08264A]">{title}</h3>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        <span className="h-1 w-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
      </div>

      <span className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-9 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 group-hover:from-blue-500 group-hover:to-cyan-400 group-hover:shadow-xl group-hover:-translate-y-0.5">
        Нэвтрэх
        <LuArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
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

        {/* Cards */}
        <div className="mx-auto mt-12 grid max-w-3xl gap-8 md:grid-cols-2">
          <RoleCard href="/login/sender" title="Тайлан илгээх байгууллага" icon={<LuSend size={34} />} />
          <RoleCard href="/login/reviewer" title="Тайлан хянах байгууллага" icon={<LuFileSearch size={34} />} />
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
