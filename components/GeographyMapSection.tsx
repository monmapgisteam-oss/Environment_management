'use client';

import dynamic from 'next/dynamic';
import type { GeoPoint } from '@/lib/reviewedLocations';

// Leaflet touches `window` on import, so load the map client-side only.
const GeographyMap = dynamic(() => import('./GeographyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
      Газрын зураг ачааллаж байна...
    </div>
  ),
});

export default function GeographyMapSection({ points }: { points: GeoPoint[] }) {
  return <GeographyMap points={points} />;
}
