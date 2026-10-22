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
      className="group/card flex flex-col border border-slate-200 bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-card"
    >
      <span className="flex h-12 w-12 items-center justify-center bg-teal-50 text-teal-700">{icon}</span>
      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">{subtitle}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
        Нэвтрэх
        <LuArrowRight size={16} className="transition-transform duration-200 group-hover/card:translate-x-1" />
      </span>
    </Link>
  );
}
