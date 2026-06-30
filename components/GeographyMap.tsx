'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint } from '@/lib/reviewedLocations';

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function popupHtml(p: GeoPoint): string {
  const body = p.rows
    .map(([l, v]) => `<div><span style="color:#64748b">${esc(l)}:</span> <b>${esc(v)}</b></div>`)
    .join('');
  return (
    `<div style="font-size:12px;line-height:1.55;min-width:190px">` +
    `<div style="font-weight:700;margin-bottom:4px;color:#0f172a">${esc(p.title)}</div>` +
    (body || '<div style="color:#94a3b8">Судалгааны мэдээлэл алга</div>') +
    `</div>`
  );
}

export default function GeographyMap({ points }: { points: GeoPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    const map = L.map(ref.current, { center: [47.92, 106.92], zoom: 6 });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const latlngs: L.LatLngExpression[] = [];
    points.forEach((p) => {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 8,
        color: '#1d4ed8',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.75,
      });
      marker.bindPopup(popupHtml(p));
      marker.addTo(map);
      latlngs.push([p.lat, p.lng]);
    });

    if (latlngs.length > 0) map.fitBounds(L.latLngBounds(latlngs).pad(0.2));

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className="w-full h-full" />;
}
