import Link from 'next/link';
import type { ReactNode } from 'react';
import { HiOutlineInbox } from 'react-icons/hi';

type Props = {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: { label: string; href: string };
};

// Friendly empty list: icon, one-line title, optional hint and a next step.
export default function EmptyState({ title, hint, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center bg-slate-100 text-slate-400">
        {icon ?? <HiOutlineInbox size={24} />}
      </span>
      <p className="mt-4 text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex h-10 items-center bg-color-primary px-4 text-sm font-semibold text-white transition hover:bg-color-primary-dark"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
