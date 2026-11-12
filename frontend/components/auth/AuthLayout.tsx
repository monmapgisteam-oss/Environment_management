import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuClipboardCheck, LuMapPinned, LuShieldCheck } from 'react-icons/lu';
import ThemeToggle from '@/components/ui/ThemeToggle';

const POINTS = [
  { icon: <LuClipboardCheck size={20} />, title: 'Цахим тайлан', text: 'Жилийн төлөвлөгөө, биелэлтийн тайланг цахимаар илгээж, явцыг нь хянана.' },
  { icon: <LuShieldCheck size={20} />, title: 'Журмын үнэлгээ', text: 'Батлагдсан шалгуураар үнэлж, тоон гарын үсгээр баталгаажуулна.' },
  { icon: <LuMapPinned size={20} />, title: 'Газрын зураг', text: 'Төслийн байршил, үнэлгээний дүнг нэг зураг дээр харна.' },
];

// Split screen for the public pages: brand panel on the left, a card with the
// page's content on the right. The brand panel collapses to a short header on
// small screens.
type Props = { children: ReactNode; size?: 'md' | 'lg' };

export default function AuthLayout({ children, size = 'md' }: Props) {
  const width = size === 'lg' ? 'max-w-[820px]' : 'max-w-[480px]';
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside className="relative hidden w-[42%] max-w-[680px] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0B5B55] via-[#0F766E] to-[#115E59] px-12 py-10 text-white lg:flex">
        {/* Large faded emblem as a watermark */}
        <img
          src="/logo.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 h-[520px] w-[520px] opacity-[0.08] grayscale"
        />
        <Link href="/" className="relative flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center bg-white/10 ring-1 ring-white/20">
            <img src="/logo.svg" alt="" width={48} height={48} className="h-12 w-12" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-bold">Байгаль орчны менежментийн</span>
            <span className="block text-base text-teal-100">төлөвлөгөөний систем</span>
          </span>
        </Link>

        <div className="relative max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">Нийслэлийн Байгаль орчны газар</p>
          <h2 className="mt-4 text-[30px] font-bold leading-[1.2]">
            Байгаль орчны менежментийн төлөвлөгөө болон тайлангаа нэг дороос илгээж, хянуулж, үнэлүүлнэ.
          </h2>
          <ul className="mt-8 grid gap-2.5">
            {POINTS.map((point) => (
              <li key={point.title} className="flex items-start gap-3.5 border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-white/10 text-teal-100">{point.icon}</span>
                <span>
                  <span className="block text-[15px] font-semibold">{point.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-teal-100/90">{point.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-teal-200/70">© {new Date().getFullYear()} Байгаль орчны менежментийн төлөвлөгөөний систем</p>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Faint grid so the right side is not a flat void */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <header className="relative flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-4 lg:hidden">
          <img src="/logo.svg" alt="" width={36} height={36} className="h-9 w-9" />
          <span className="flex-1 text-sm font-semibold text-slate-900">Байгаль орчны менежментийн төлөвлөгөөний систем</span>
          <ThemeToggle />
        </header>
        <ThemeToggle className="absolute right-6 top-6 z-10 hidden lg:flex" />
        <main className="relative flex min-h-full flex-1 items-center justify-center px-6 py-8">
          <div className={`w-full ${width} border border-slate-200 bg-white p-7 shadow-card sm:p-9`}>{children}</div>
        </main>
      </div>
    </div>
  );
}
