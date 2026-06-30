'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type CompanyPoint = {
  lat: number;
  lng: number;
  company: string;
  register: string;
  reportNumber: string;
  reportType: string;
  location: string;
};

interface CompanyMapProps {
  // Company/report locations sourced from our own database.
  points: CompanyPoint[];
  // register number -> company name, used to tie an external survey point back
  // to a company that already exists in our system.
  companyByRegister: Record<string, string>;
}

// External Survey123 / ArcGIS point layer that companies fill in separately.
const SURVEY_LAYER_URL =
  'https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson';

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function row(label: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  return `<div><span style="color:#64748b">${label}:</span> <b>${esc(value)}</b></div>`;
}

export default function CompanyMap({ points, companyByRegister }: CompanyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [47.92, 106.92], // Ulaanbaatar
      zoom: 6,
    });
    mapInstanceRef.current = map;

    const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // --- Layer 1: company locations from our own database (blue) ---
    const dbLayer = L.layerGroup();
    const dbLatLngs: L.LatLngExpression[] = [];
    points.forEach((p) => {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 8,
        color: '#1d4ed8',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.75,
      });
      marker.bindPopup(
        `<div style="font-size:12px;line-height:1.5;min-width:170px">` +
          row('Байгууллага', p.company) +
          row('Регистрийн дугаар', p.register) +
          row('Тайлангийн дугаар', p.reportNumber) +
          row('Төрөл', p.reportType) +
          row('Байршил', p.location) +
          `</div>`,
      );
      marker.addTo(dbLayer);
      dbLatLngs.push([p.lat, p.lng]);
    });
    dbLayer.addTo(map);

    // --- Layer 2: external Survey123 points (teal) ---
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
        const props = feature.properties || {};
        const register = props.Register;
        const matched = register ? companyByRegister[String(register).trim()] : undefined;
        layer.bindPopup(
          `<div style="font-size:12px;line-height:1.5;min-width:170px">` +
            row('Төслийн нэр', props.project_name) +
            row('Байгууллага', props.Organization) +
            row('Регистрийн дугаар', register) +
            row('Тайлангийн төрөл', props.Report_type) +
            row('Огноо', props.Project_date) +
            (matched
              ? `<div style="margin-top:4px;color:#0d9488"><b>✔ Манай бүртгэлд: ${esc(matched)}</b></div>`
              : `<div style="margin-top:4px;color:#b45309">Манай бүртгэлд олдсонгүй</div>`) +
            `</div>`,
        );
      },
    }).addTo(map);

    let cancelled = false;
    fetch(SURVEY_LAYER_URL)
      .then((res) => res.json())
      .then((geojson) => {
        if (cancelled || !mapInstanceRef.current) return;
        if (geojson && Array.isArray(geojson.features)) {
          surveyLayer.addData(geojson);
          const sb = surveyLayer.getBounds();
          // Fit to everything once survey data is in, if we have any geometry.
          const all = L.latLngBounds(dbLatLngs);
          if (sb.isValid()) all.extend(sb);
          if (all.isValid()) map.fitBounds(all.pad(0.2));
        }
      })
      .catch(() => {
        /* overlay is optional — ignore fetch/network errors */
      });

    L.control
      .layers(
        { 'Газрын зураг': baseLayer },
        {
          'Манай бүртгэлийн байршил': dbLayer,
          'Судалгааны цэгүүд (Survey123)': surveyLayer,
        },
        { collapsed: false },
      )
      .addTo(map);

    // Initial fit to DB points (survey fit happens after fetch resolves).
    if (dbLatLngs.length > 0) {
      map.fitBounds(L.latLngBounds(dbLatLngs).pad(0.2));
    }

    return () => {
      cancelled = true;
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mapRef} className="w-full h-full" />;
}
