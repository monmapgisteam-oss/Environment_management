'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addBasemap } from '@/lib/map/basemap';
import { createPinIcon } from '@/lib/map/markers';

interface MapPickerProps {
  lat: number;
  lng: number;
  hasMarker: boolean;
  onMapClick: (lat: number, lng: number) => void;
}

export default function MapPicker({ lat, lng, hasMarker, onMapClick }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 12,
      zoomControl: true,
    });

    addBasemap(map);

    const icon = createPinIcon('#0F766E', 'lg');

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng], { icon }).addTo(map);
      }

      onMapClick(clickLat, clickLng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (hasMarker) {
      const icon = createPinIcon('#0F766E', 'lg');

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current);
      }

      mapInstanceRef.current.setView([lat, lng], 15);
    }
  }, [lat, lng, hasMarker]);

  return <div ref={mapRef} className="w-full h-full" />;
}
