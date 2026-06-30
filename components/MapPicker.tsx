'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapPickerProps {
  lat: number;
  lng: number;
  hasMarker: boolean;
  onMapClick: (lat: number, lng: number) => void;
}

// ArcGIS / Survey123 FeatureServer (point layer) shown as a toggleable overlay
// so users can see existing surveyed report locations on the map.
const SURVEY_LAYER_URL =
  'https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';

function surveyPopup(props: Record<string, any>): string {
  const rows: [string, any][] = [
    ['Төслийн нэр', props.project_name],
    ['Байгууллага', props.Organization],
    ['Тайлангийн төрөл', props.Report_type],
    ['Регистр', props.Register],
    ['Огноо', props.Project_date],
    ['Тайлбар', props.Description],
  ];
  const body = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([label, v]) => `<div><span style="color:#64748b">${label}:</span> <b>${String(v)}</b></div>`)
    .join('');
  return `<div style="font-size:12px;line-height:1.5;min-width:160px">${body || 'Мэдээлэл байхгүй'}</div>`;
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

    const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // Survey123 point overlay — fetched as GeoJSON and rendered with popups.
    const surveyLayer = L.geoJSON(undefined, {
      pointToLayer: (_feature, latlng) =>
        L.circleMarker(latlng, {
          radius: 7,
          color: '#0d9488',
          weight: 2,
          fillColor: '#14b8a6',
          fillOpacity: 0.7,
        }),
      onEachFeature: (feature, layer) => {
        layer.bindPopup(surveyPopup(feature.properties || {}));
      },
    }).addTo(map);

    let cancelled = false;
    fetch(SURVEY_LAYER_URL)
      .then((res) => res.json())
      .then((geojson) => {
        if (cancelled || !mapInstanceRef.current) return;
        if (geojson && Array.isArray(geojson.features)) {
          surveyLayer.addData(geojson);
        }
      })
      .catch(() => {
        /* overlay is optional — ignore fetch/network errors */
      });

    L.control
      .layers(
        { 'Газрын зураг': baseLayer },
        { 'Судалгааны цэгүүд': surveyLayer },
        { collapsed: false },
      )
      .addTo(map);

    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

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
      cancelled = true;
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (hasMarker) {
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

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
