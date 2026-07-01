'use client';

import dynamic from 'next/dynamic';
import type { CompanyPoint } from './CompanyMap';

// Leaflet touches `window` on import, so the map is loaded client-side only,
// as a separate chunk that's fetched on demand instead of bundled into the
// page's main JS.
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
  detailRole?: 'reviewer' | 'staff';
}

export default function CompanyMapSection({ points, detailRole }: Props) {
  return <CompanyMap points={points} detailRole={detailRole} />;
}
