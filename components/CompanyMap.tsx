'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { HiSearch, HiX, HiOfficeBuilding } from 'react-icons/hi';
import { addBasemap } from '@/lib/basemap';
import { createPinIcon, popupCard, scoreBucket, SCORE_COLORS, SCORE_LABELS, type ScoreBucket } from '@/lib/mapMarkers';
import { STATUS_LABELS, STATUS_BADGE_COLORS } from '@/lib/constants';

export type CompanyPoint = {
  id: string;
  lat: number;
  lng: number;
  company: string;
  register: string;
  reportNumber: string;
  reportType: string;
  location: string;
  status: string;
  score: number | null;
};

interface CompanyMapProps {
  points: CompanyPoint[];
  // Which portal the "Дэлгэрэнгүй харах" popup link opens the report in
  // (/report/[id]?role=...) — admin/reviewer see everything, staff see only
  // their own scoring, sender sees their own report's detail.
  detailRole?: 'reviewer' | 'staff' | 'sender';
}

const UB_CENTER: L.LatLngExpression = [47.92, 106.92];

export default function CompanyMap({ points, detailRole = 'reviewer' }: CompanyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersByIdRef = useRef<Map<string, L.Marker>>(new Map());

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);

  const filteredPoints = useMemo(() => {
    const term = search.trim().toLowerCase();
    return points.filter((p) => {
      if (term && !p.register.toLowerCase().includes(term) && !p.company.toLowerCase().includes(term)) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }, [points, search, statusFilter]);

  const statusOptions = useMemo(() => {
    const present = new Set(points.map((p) => p.status));
    return Object.keys(STATUS_LABELS).filter((s) => present.has(s));
  }, [points]);

  // --- Map + cluster group: created once ---
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: UB_CENTER,
      zoom: 6,
      zoomControl: false,
    });
    mapInstanceRef.current = map;

    addBasemap(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    // Give the zoom control our own class so globals.css can restyle it
    // without touching Leaflet's other default controls.
    const zoomEl = map.getContainer().querySelector('.leaflet-control-zoom');
    zoomEl?.classList.add('map-zoom-control');

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (c) =>
        L.divIcon({
          html: `<div class="company-cluster-icon">${c.getChildCount()}</div>`,
          className: '',
          iconSize: [38, 38],
        }),
    });
    clusterRef.current = cluster;
    map.addLayer(cluster);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  // --- Markers: rebuilt whenever the filtered result set changes ---
  useEffect(() => {
    const cluster = clusterRef.current;
    const map = mapInstanceRef.current;
    if (!cluster || !map) return;

    cluster.clearLayers();
    markersByIdRef.current.clear();

    filteredPoints.forEach((p) => {
      const bucket = scoreBucket(p.score);
      const icon = createPinIcon(SCORE_COLORS[bucket]);
      const marker = L.marker([p.lat, p.lng], { icon });
      marker.bindPopup(
        popupCard({
          title: p.company,
          accent: SCORE_COLORS[bucket],
          badge: STATUS_LABELS[p.status] || p.status,
          badgeClass: STATUS_BADGE_COLORS[p.status] || 'badge-gray',
          rows: [
            ['Регистрийн дугаар', p.register],
            ['Хаяг', p.location],
            ['Хяналтын үнэлгээ', p.score != null ? `${p.score} (${SCORE_LABELS[bucket]})` : SCORE_LABELS.none],
            ['Тайлангийн дугаар', p.reportNumber],
          ],
          link: { label: 'Дэлгэрэнгүй харах', href: `/report/${p.id}?role=${detailRole}` },
        }),
      );
      marker.addTo(cluster);
      markersByIdRef.current.set(p.id, marker);
    });

    if (filteredPoints.length === 1) {
      // A single match (typically a full register-number search) — zoom
      // straight to it and pop its card open.
      const only = markersByIdRef.current.get(filteredPoints[0].id);
      if (only) cluster.zoomToShowLayer(only, () => only.openPopup());
    } else if (filteredPoints.length > 1) {
      map.fitBounds(L.latLngBounds(filteredPoints.map((p) => [p.lat, p.lng] as L.LatLngTuple)).pad(0.2));
    }
  }, [filteredPoints, detailRole]);

  const flyToPoint = (p: CompanyPoint) => {
    const cluster = clusterRef.current;
    const marker = markersByIdRef.current.get(p.id);
    if (!cluster || !marker) return;
    cluster.zoomToShowLayer(marker, () => marker.openPopup());
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Mobile toggle for the control panel */}
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className="absolute left-2 top-2 z-[600] flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-lg sm:hidden"
        aria-label="Хайлт, шүүлтүүр"
      >
        {panelOpen ? <HiX size={18} className="text-slate-600" /> : <HiSearch size={18} className="text-slate-600" />}
      </button>

      {/* Floating left control panel */}
      <div
        className={`absolute left-2 top-14 sm:top-2 z-[500] ${panelOpen ? 'flex' : 'hidden'} sm:flex w-[220px] max-w-[78vw] max-h-[calc(100%-8rem)] sm:max-h-[calc(100%-5.5rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/97 shadow-lg backdrop-blur`}
      >
        <div className="space-y-2 border-b border-slate-100 p-2.5">
          <div className="relative">
            <HiSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Компанийн РД хайх..."
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2.5 text-[11.5px] text-slate-700 placeholder:text-slate-400 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11.5px] text-slate-700 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Бүх төлөв</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

        </div>

        <div className="flex items-center justify-between px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          <span>Байгууллага</span>
          <span>{filteredPoints.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-1.5 pb-2">
          {filteredPoints.length === 0 ? (
            <p className="px-2 py-5 text-center text-[11.5px] text-slate-400">Илэрц олдсонгүй.</p>
          ) : (
            filteredPoints.map((p) => {
              const bucket = scoreBucket(p.score);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => flyToPoint(p)}
                  className="flex w-full items-start gap-2 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-slate-50"
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white"
                    style={{ backgroundColor: SCORE_COLORS[bucket] }}
                  >
                    <HiOfficeBuilding size={11} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-semibold text-slate-800">{p.company}</span>
                    <span className="block truncate text-[10px] text-slate-400">{p.register}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute left-2 bottom-2 z-[500] rounded-lg border border-slate-200 bg-white/97 px-2.5 py-2 shadow-lg backdrop-blur">
        <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">Хяналтын үнэлгээ</p>
        <div className="flex flex-col gap-0.5">
          {(Object.keys(SCORE_COLORS) as ScoreBucket[]).map((bucket) => (
            <div key={bucket} className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: SCORE_COLORS[bucket] }} />
              <span className="text-[10.5px] text-slate-600">{SCORE_LABELS[bucket]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
