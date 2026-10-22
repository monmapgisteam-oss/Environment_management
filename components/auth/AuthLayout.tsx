import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuClipboardCheck, LuMapPinned, LuShieldCheck } from 'react-icons/lu';

const POINTS = [
  { icon: <LuClipboardCheck size={18} />, text: 'Жилийн төлөвлөгөө, биелэлтийн тайланг цахимаар илгээж, хянуулна' },
  { icon: <LuShieldCheck size={18} />, text: 'Журмын шалгуураар үнэлж, тоон гарын үсгээр баталгаажуулна' },
  { icon: <LuMapPinned size={18} />, text: 'Төслийн байршил, үнэлгээг газрын зураг дээр харна' },
];

// Split screen for the public pages: brand panel on the left, content on the
// right. The brand panel collapses to a short header on small screens.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="relative hidden w-[44%] max-w-[620px] flex-col justify-between overflow-hidden bg-[#0B5B55] px-12 py-12 text-white lg:flex">
        {/* Quiet topographic lines, hinting at the map side of the system. */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full text-white/[0.07]" viewBox="0 0 600 800" fill="none" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M-50 ${520 + i * 46} C 120 ${440 + i * 40}, 240 ${600 + i * 30}, 420 ${500 + i * 44} S 640 ${560 + i * 40}, 700 ${520 + i * 46}`}
              stroke="currentColor"
              strokeWidth="1.5"
            />
          ))}
        </svg>
        <Link href="/" className="relative flex items-center gap-4">
          <img src="/logo.svg" alt="" width={56} height={56} className="h-14 w-14" />
          <span className="leading-tight">
            <span className="block text-lg font-bold">Байгаль орчны менежментийн</span>
            <span className="block text-base text-teal-100">төлөвлөгөөний систем</span>
          </span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">
            Тайлангаа нэг дороос илгээж, хянуулж, үнэлүүлнэ.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point.text} className="flex items-start gap-3 text-[15px] text-teal-50">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center bg-white/10 text-teal-100">
                  {point.icon}
                </span>
                {point.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-teal-200/80">Нийслэлийн Байгаль орчны газар</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-4 lg:hidden">
          <img src="/logo.svg" alt="" width={36} height={36} className="h-9 w-9" />
          <span className="text-sm font-semibold text-slate-900">Байгаль орчны менежментийн төлөвлөгөөний систем</span>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-12">{children}</main>
      </div>
    </div>
  );
}
