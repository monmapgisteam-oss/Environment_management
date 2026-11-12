'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addBasemap } from '@/lib/map/basemap';
import { createPinIcon } from '@/lib/map/markers';

interface LocationMapProps {
  lat: number;
  lng: number;
}

// Read-only single-pin map on our own Esri basemap (matches MapPicker/CompanyMap),
// used wherever a report's location just needs to be shown, not edited.
export default function LocationMap({ lat, lng }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
    });
    addBasemap(map);
    L.marker([lat, lng], { icon: createPinIcon('#0F766E', 'lg') }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng]);

  return <div ref={mapRef} className="w-full h-full" />;
}
