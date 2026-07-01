import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuArrowRight } from 'react-icons/lu';

type Props = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  href: string;
};

// A landing-page card that links to the organisation's own login page, where
// the person types their email and password.
export default function OrgLoginCard({ title, subtitle, icon, href }: Props) {
  return (
    <Link
      href={href}
      className="group/card relative flex flex-col rounded-[20px] border border-slate-200 bg-white px-8 py-10 text-center shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600 ring-1 ring-teal-100">
        {icon}
      </div>

      <h3 className="mt-6 text-xl font-bold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>

      <span className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-5 text-sm font-semibold text-white transition-colors duration-200 group-hover/card:bg-[#115E59]">
        Нэвтрэх
        <LuArrowRight size={16} className="transition-transform duration-300 group-hover/card:translate-x-1" />
      </span>
    </Link>
  );
}
