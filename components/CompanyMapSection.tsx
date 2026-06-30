'use client';

import dynamic from 'next/dynamic';
import type { CompanyPoint } from './CompanyMap';

// Leaflet touches `window` on import, so the map is loaded client-side only.
const CompanyMap = dynamic(() => import('./CompanyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
      Газрын зураг ачааллаж байна...
    </div>
  ),
});

interface Props {
  points: CompanyPoint[];
  companyByRegister: Record<string, string>;
}

export default function CompanyMapSection({ points, companyByRegister }: Props) {
  return <CompanyMap points={points} companyByRegister={companyByRegister} />;
}
