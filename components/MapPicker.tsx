'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addBasemap } from '@/lib/basemap';
import { createPinIcon, popupCard } from '@/lib/mapMarkers';
import { SURVEY_EXCLUDED_OBJECT_IDS } from '@/lib/constants';
import { normalizeSurveyReportType } from '@/lib/surveyReportType';

interface MapPickerProps {
  lat: number;
  lng: number;
  hasMarker: boolean;
  onMapClick: (lat: number, lng: number) => void;
  showSurveyLayer?: boolean;
}

// ArcGIS / Survey123 FeatureServer (point layer) shown as a toggleable overlay
// so users can see existing surveyed report locations on the map.
const SURVEY_LAYER_URL =
  `https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer/0/query?where=${encodeURIComponent(`OBJECTID NOT IN (${SURVEY_EXCLUDED_OBJECT_IDS.join(',')})`)}&outFields=*&f=geojson`;

function surveyPopup(props: Record<string, any>): string {
  return popupCard({
    title: props.Organization || props.project_name || 'Судалгааны цэг',
    accent: '#D97706',
    badge: 'Survey123',
    rows: [
      ['Төслийн нэр', props.project_name],
      ['Байгууллага', props.Organization],
      ['Тайлангийн төрөл', normalizeSurveyReportType(props.Report_type)],
      ['Регистр', props.Register],
      ['Огноо', props.Project_date],
      ['Тайлбар', props.Description],
    ],
  });
}

export default function MapPicker({ lat, lng, hasMarker, onMapClick, showSurveyLayer = false }: MapPickerProps) {
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

    const baseLayer = addBasemap(map);

    let cancelled = false;
    if (showSurveyLayer) {
      // Survey123 point overlay — fetched as GeoJSON and rendered with popups.
      const surveyIcon = createPinIcon('#D97706');
      const surveyLayer = L.geoJSON(undefined, {
        pointToLayer: (_feature, latlng) => L.marker(latlng, { icon: surveyIcon }),
        onEachFeature: (feature, layer) => {
          layer.bindPopup(surveyPopup(feature.properties || {}));
        },
      }).addTo(map);

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
    }

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
      cancelled = true;
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
