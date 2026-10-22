import type { ReactNode } from 'react';

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  // Small label above the title, e.g. the section the page belongs to.
  eyebrow?: ReactNode;
  // Buttons or links shown on the right.
  actions?: ReactNode;
};

// Page title row used by every portal page: one typography scale everywhere.
export default function PageHeader({ title, subtitle, eyebrow, actions }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-teal-700">{eyebrow}</p>}
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
