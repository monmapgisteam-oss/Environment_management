import type { ReactNode } from 'react';

export type Kpi = {
  label: string;
  value: ReactNode;
  note?: string;
  // Tailwind background class of the coloured edge.
  accent: string;
};

// One white strip split into columns, one number each. Shared by every dashboard.
export default function KpiStrip({ items }: { items: Kpi[] }) {
  const cols = items.length === 3 ? 'md:grid-cols-3' : items.length === 5 ? 'md:grid-cols-5' : 'md:grid-cols-4';
  return (
    <section className={`grid grid-cols-2 divide-slate-200 border border-slate-200 bg-white shadow-soft md:divide-x ${cols}`}>
      {items.map((kpi) => (
        <div key={kpi.label} className="flex gap-4 px-6 py-5">
          <span className={`w-1 shrink-0 ${kpi.accent}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
            <p className="mt-1 text-[32px] font-bold leading-none tracking-tight text-slate-900">{kpi.value}</p>
            {kpi.note && <p className="mt-2 truncate text-xs text-slate-400">{kpi.note}</p>}
          </div>
        </div>
      ))}
    </section>
  );
}
