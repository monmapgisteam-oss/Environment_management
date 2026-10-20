'use client';

import dynamic from 'next/dynamic';

const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
      Газрын зураг ачааллаж байна...
    </div>
  ),
});

export default LocationMap;
