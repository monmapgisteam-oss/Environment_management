import Link from 'next/link';
import { LuShieldCheck, LuSend, LuFileSearch, LuUserCog } from 'react-icons/lu';
import OrgLoginCard from '@/components/auth/OrgLoginCard';

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FAFC] px-4 py-12">
      {/* Soft, premium teal background — corner blobs, top-left & bottom-right
          waves, low-opacity circles and a couple of faint dot patches. Kept
          subtle, with a bright center so the white container stays crisp. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Corner gradient blobs */}
        <div className="absolute -top-44 -left-36 h-[26rem] w-[26rem] rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute -top-28 right-[-9rem] h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="absolute -bottom-52 -right-36 h-[30rem] w-[30rem] rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[-8rem] h-72 w-72 rounded-full bg-emerald-100/40 blur-3xl" />

        {/* Extra soft blurred teal circles, very low opacity */}
        <div className="absolute top-24 left-[22%] h-40 w-40 rounded-full bg-teal-300/10 blur-2xl" />
        <div className="absolute bottom-28 right-[22%] h-44 w-44 rounded-full bg-emerald-300/10 blur-2xl" />

        {/* Bright center glow keeps the container area clean and readable */}
        <div className="absolute left-1/2 top-1/2 h-[42rem] w-[62rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-3xl" />

        {/* Glassy translucent bubbles with a soft highlight (drawn on top of the
            glow so they stay visible, but kept near the edges) */}
        <div className="absolute left-[6%] top-[14%] h-44 w-44 rounded-full bg-gradient-to-br from-teal-100/60 to-teal-300/25 ring-1 ring-white/50 shadow-[inset_0_2px_24px_rgba(255,255,255,0.6)] backdrop-blur-[2px]">
          <span className="absolute left-[26%] top-[22%] h-6 w-6 rounded-full bg-white/70 blur-[3px]" />
        </div>
        <div className="absolute right-[8%] top-[20%] h-28 w-28 rounded-full bg-gradient-to-br from-emerald-100/55 to-teal-200/25 ring-1 ring-white/50 shadow-[inset_0_2px_18px_rgba(255,255,255,0.6)] backdrop-blur-[2px]">
          <span className="absolute left-[28%] top-[24%] h-4 w-4 rounded-full bg-white/70 blur-[2px]" />
        </div>
        <div className="absolute right-[14%] bottom-[12%] h-52 w-52 rounded-full bg-gradient-to-br from-teal-100/55 to-teal-300/20 ring-1 ring-white/50 shadow-[inset_0_2px_26px_rgba(255,255,255,0.6)] backdrop-blur-[2px]">
          <span className="absolute left-[24%] top-[22%] h-7 w-7 rounded-full bg-white/70 blur-[3px]" />
        </div>
        <div className="absolute left-[12%] bottom-[16%] h-20 w-20 rounded-full bg-gradient-to-br from-emerald-100/55 to-teal-200/25 ring-1 ring-white/50 shadow-[inset_0_2px_14px_rgba(255,255,255,0.6)] backdrop-blur-[2px]">
          <span className="absolute left-[28%] top-[24%] h-3 w-3 rounded-full bg-white/70 blur-[2px]" />
        </div>
        <div className="absolute left-[40%] top-[6%] h-12 w-12 rounded-full bg-gradient-to-br from-teal-100/50 to-teal-300/20 ring-1 ring-white/50 shadow-[inset_0_1px_10px_rgba(255,255,255,0.6)] backdrop-blur-[2px]" />

        {/* Curved wave lines — top-left corner */}
        <svg className="absolute -left-12 -top-12 h-[24rem] w-[24rem] text-teal-500/[0.18]" viewBox="0 0 220 220" fill="none" aria-hidden="true">
          <path d="M70 0A70 70 0 0 1 0 70" stroke="currentColor" strokeWidth="2" />
          <path d="M120 0A120 120 0 0 1 0 120" stroke="currentColor" strokeWidth="2" />
          <path d="M170 0A170 170 0 0 1 0 170" stroke="currentColor" strokeWidth="2" />
        </svg>

        {/* Curved wave lines — bottom-right corner */}
        <svg className="absolute -right-12 -bottom-12 h-[24rem] w-[24rem] text-emerald-500/[0.18]" viewBox="0 0 220 220" fill="none" aria-hidden="true">
          <path d="M150 220A70 70 0 0 1 220 150" stroke="currentColor" strokeWidth="2" />
          <path d="M100 220A120 120 0 0 1 220 100" stroke="currentColor" strokeWidth="2" />
          <path d="M50 220A170 170 0 0 1 220 50" stroke="currentColor" strokeWidth="2" />
        </svg>

        {/* Faint dot patches in a couple of areas only */}
        <svg className="absolute right-10 top-14 h-32 w-32 text-teal-600/[0.07]" aria-hidden="true">
          <defs>
            <pattern id="login-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-dots)" />
        </svg>
        <svg className="absolute left-10 bottom-14 h-32 w-32 text-teal-600/[0.07]" aria-hidden="true">
          <rect width="100%" height="100%" fill="url(#login-dots)" />
        </svg>
      </div>

      {/* Main container */}
      <div className="relative z-10 w-full max-w-[1100px] border border-slate-200 bg-white/85 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-12 lg:p-16">
        {/* Top section */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-teal-600/25">
            <LuShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Байгаль орчны менежментийн төлөвлөгөөний систем
          </h1>
          <p className="mt-3 text-base text-slate-500">Та нэвтрэх төрлөө сонгоно уу</p>
        </div>

        {/* Cards — each organisation links to its own email/password login page. */}
        <div className="mx-auto mt-12 grid max-w-3xl items-start gap-6 md:grid-cols-2">
          <OrgLoginCard
            title="Тайлан илгээх байгууллага"
            subtitle="Имэйл, нууц үгээрээ нэвтэрнэ үү."
            icon={<LuSend size={30} />}
            href="/login/sender"
          />
          <OrgLoginCard
            title="Тайлан хянах байгууллага"
            subtitle="Имэйл, нууц үгээрээ нэвтэрнэ үү."
            icon={<LuFileSearch size={30} />}
            href="/login/reviewer"
          />
        </div>

        {/* Admin link */}
        <div className="mt-10 text-center">
          <Link
            href="/login/admin"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-[#0F766E] transition-colors hover:text-[#115E59]"
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
