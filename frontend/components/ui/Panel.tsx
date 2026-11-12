import Link from 'next/link';
import type { ReactNode } from 'react';
import { HiOutlineArrowRight } from 'react-icons/hi';

type Props = {
  title: string;
  subtitle?: string;
  // "See all" style link in the header.
  link?: { label: string; href: string };
  // Small count badge next to the title.
  count?: number;
  children: ReactNode;
  className?: string;
};

// Dashboard card with a titled header. Children are the body (lists use
// divide-y, text uses padding of its own).
export default function Panel({ title, subtitle, link, count, children, className = '' }: Props) {
  return (
    <div className={`border border-slate-200 bg-white shadow-soft ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            {title}
            {count != null && (
              <span className="bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{count}</span>
            )}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {link && (
          <Link href={link.href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-teal-700 hover:underline">
            {link.label} <HiOutlineArrowRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-slate-500">{children}</p>;
}
