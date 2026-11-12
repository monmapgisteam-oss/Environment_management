import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuChevronRight } from 'react-icons/lu';

type Props = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  href: string;
};

// One organisation type on the landing page: a row that links to that
// organisation's own login page.
export default function OrgLoginCard({ title, subtitle, icon, href }: Props) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 border border-slate-200 bg-white px-4 py-4 transition hover:border-teal-500 hover:bg-teal-50/40"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-teal-50 text-teal-700 transition group-hover:bg-teal-600 group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{subtitle}</span>
      </span>
      <LuChevronRight size={18} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-600" />
    </Link>
  );
}
