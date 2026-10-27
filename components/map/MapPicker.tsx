'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { addBasemap } from '@/lib/map/basemap';
import { createPinIcon, popupCard } from '@/lib/map/markers';
import { normalizeSurveyReportType } from '@/lib/survey/reportType';

interface MapPickerProps {
  lat: number;
  lng: number;
  hasMarker: boolean;
  onMapClick: (lat: number, lng: number) => void;
  showSurveyLayer?: boolean;
}

// Survey layer points (served by the app from Convex)
// shown as a toggleable overlay of existing surveyed report locations.
const SURVEY_LAYER_URL = '/api/survey/features';

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

    // With the survey overlay, one control lists both basemaps and overlay.
    const baseLayers = addBasemap(map, { control: !showSurveyLayer });

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
          baseLayers,
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
