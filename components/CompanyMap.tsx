'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { HiOfficeBuilding, HiSearch, HiX } from 'react-icons/hi';
import { addBasemap } from '@/lib/basemap';
import { createPinIcon, popupCard, scoreBucket, SCORE_COLORS, SCORE_LABELS, type ScoreBucket } from '@/lib/mapMarkers';
import { STATUS_BADGE_COLORS, STATUS_LABELS } from '@/lib/constants';

export type CompanyPoint = {
  id: string;
  source?: 'report' | 'survey';
  lat: number;
  lng: number;
  company: string;
  register: string;
  reportNumber: string;
  reportType: string;
  location: string;
  status: string;
  score: number | null;
  province?: string;
  district?: string;
  description?: string;
  projectDate?: string;
  organization?: string;
  photos?: { src: string; alt?: string }[];
};

interface CompanyMapProps {
  points: CompanyPoint[];
  detailRole?: 'reviewer' | 'staff' | 'sender';
}

const UB_CENTER: L.LatLngExpression = [47.92, 106.92];
const PROVINCE_CENTERS = [
  { name: 'Улаанбаатар', lat: 47.92, lng: 106.92 },
  { name: 'Дархан-Уул', lat: 49.49, lng: 105.92 },
  { name: 'Орхон', lat: 49.03, lng: 104.04 },
  { name: 'Архангай', lat: 47.47, lng: 101.45 },
  { name: 'Баян-Өлгий', lat: 48.97, lng: 89.97 },
  { name: 'Баянхонгор', lat: 46.19, lng: 100.72 },
  { name: 'Булган', lat: 48.81, lng: 103.53 },
  { name: 'Говь-Алтай', lat: 46.37, lng: 96.26 },
  { name: 'Говьсүмбэр', lat: 46.36, lng: 108.36 },
  { name: 'Дорноговь', lat: 44.89, lng: 110.14 },
  { name: 'Дорнод', lat: 48.07, lng: 114.54 },
  { name: 'Дундговь', lat: 45.76, lng: 106.27 },
  { name: 'Завхан', lat: 47.74, lng: 96.84 },
  { name: 'Өвөрхангай', lat: 46.26, lng: 102.78 },
  { name: 'Өмнөговь', lat: 43.58, lng: 104.43 },
  { name: 'Сүхбаатар', lat: 46.68, lng: 113.28 },
  { name: 'Сэлэнгэ', lat: 50.23, lng: 106.21 },
  { name: 'Төв', lat: 47.71, lng: 106.95 },
  { name: 'Увс', lat: 49.98, lng: 92.07 },
  { name: 'Ховд', lat: 48.01, lng: 91.64 },
  { name: 'Хөвсгөл', lat: 49.63, lng: 100.16 },
  { name: 'Хэнтий', lat: 47.32, lng: 110.65 },
];

function pointSource(point: CompanyPoint) {
  return point.source === 'survey' ? 'survey' : 'report';
}

function knownLocationName(value?: string | null) {
  const name = value?.trim();
  if (!name || name.toLowerCase().includes('тодорхойгүй')) return null;
  return name;
}

function inferProvince(point: CompanyPoint) {
  const province = knownLocationName(point.province);
  if (province) return province;
  if (point.province?.trim()) return null;

  let best = PROVINCE_CENTERS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  PROVINCE_CENTERS.forEach((center) => {
    const latDistance = point.lat - center.lat;
    const lngDistance = (point.lng - center.lng) * Math.cos((point.lat * Math.PI) / 180);
    const distance = latDistance * latDistance + lngDistance * lngDistance;
    if (distance < bestDistance) {
      best = center;
      bestDistance = distance;
    }
  });
  return best.name;
}

function pointStatusLabel(status: string) {
  if (status === 'survey') return 'Тайлан';
  return STATUS_LABELS[status] || status;
}

function pointMapKey(point: CompanyPoint, index: number) {
  return [
    pointSource(point),
    point.id,
    point.reportNumber,
    point.register,
    point.lat,
    point.lng,
    index,
  ].join(':');
}

export default function CompanyMap({ points, detailRole = 'reviewer' }: CompanyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersByIdRef = useRef<Map<string, L.Marker>>(new Map());

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'report' | 'survey'>('all');
  const [panelOpen, setPanelOpen] = useState(true);

  const filteredPoints = useMemo(() => {
    const term = search.trim().toLowerCase();
    return points.filter((p) => {
      const haystack = [p.register, p.company, p.reportNumber, p.reportType, p.description, p.organization]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (term && !haystack.includes(term)) return false;
      if (sourceFilter !== 'all' && pointSource(p) !== sourceFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }, [points, search, sourceFilter, statusFilter]);

  const statusOptions = useMemo(() => Array.from(new Set(points.map((p) => p.status))), [points]);
  const stats = useMemo(() => {
    const reports = filteredPoints.filter((p) => pointSource(p) === 'report');
    const surveys = filteredPoints.filter((p) => pointSource(p) === 'survey');
    const photoCount = surveys.reduce((sum, p) => sum + (p.photos?.length || 0), 0);
    const byProvince = new Map<string, number>();
    const byDistrict = new Map<string, { district: string; province: string; count: number }>();
    surveys.forEach((p) => {
      const province = inferProvince(p);
      const district = knownLocationName(p.district);
      if (!province) return;

      byProvince.set(province, (byProvince.get(province) || 0) + 1);
      if (!district) return;

      const districtKey = `${province}::${district}`;
      const districtRow = byDistrict.get(districtKey);
      if (districtRow) {
        districtRow.count += 1;
      } else {
        byDistrict.set(districtKey, { district, province, count: 1 });
      }
    });
    const provinceRows = Array.from(byProvince.entries())
      .map(([province, count]) => ({
        province,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.province.localeCompare(b.province));
    const districtRows = Array.from(byDistrict.values()).sort(
      (a, b) =>
        b.count - a.count ||
        a.district.localeCompare(b.district) ||
        a.province.localeCompare(b.province),
    );

    return {
      total: filteredPoints.length,
      reports: reports.length,
      surveys: surveys.length,
      photoCount,
      provinceRows,
      districtRows,
    };
  }, [filteredPoints]);
  const sourceCounts = useMemo(
    () => ({
      all: points.length,
      report: points.filter((p) => pointSource(p) === 'report').length,
      survey: points.filter((p) => pointSource(p) === 'survey').length,
    }),
    [points],
  );
  const pointGroups = useMemo(
    () => [
      { key: 'report', label: 'Reports', points: filteredPoints },
    ],
    [filteredPoints],
  );

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
    map.getContainer().querySelector('.leaflet-control-zoom')?.classList.add('map-zoom-control');

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

  useEffect(() => {
    const cluster = clusterRef.current;
    const map = mapInstanceRef.current;
    if (!cluster || !map) return;

    cluster.clearLayers();
    markersByIdRef.current.clear();

    filteredPoints.forEach((p, index) => {
      const bucket = scoreBucket(p.score);
      const isSurvey = p.source === 'survey';
      const accent = SCORE_COLORS[bucket];
      const marker = L.marker([p.lat, p.lng], { icon: createPinIcon(accent) });

      marker.bindPopup(
        popupCard({
          title: p.company,
          accent,
          badge: isSurvey ? p.reportType || pointStatusLabel(p.status) : pointStatusLabel(p.status),
          badgeClass: isSurvey ? 'map-popup-badge' : STATUS_BADGE_COLORS[p.status] || 'badge-gray',
          rows: isSurvey
            ? [
                ['Байгууллага', p.organization],
                ['Регистрийн дугаар', p.register],
                ['Төрөл', p.reportType],
                ['Огноо', p.projectDate],
                ['Тайлбар', p.description],
              ]
            : [
                ['Регистрийн дугаар', p.register],
                ['Хаяг', p.location],
                ['Хяналтын үнэлгээ', p.score != null ? `${p.score} (${SCORE_LABELS[bucket]})` : SCORE_LABELS.none],
                ['Тайлангийн дугаар', p.reportNumber],
              ],
          images: p.photos,
          link: isSurvey ? undefined : { label: 'Дэлгэрэнгүй харах', href: `/report/${p.id}?role=${detailRole}` },
        }),
      );
      marker.addTo(cluster);
      markersByIdRef.current.set(pointMapKey(p, index), marker);
    });

    if (filteredPoints.length === 1) {
      const only = markersByIdRef.current.get(pointMapKey(filteredPoints[0], 0));
      if (only) cluster.zoomToShowLayer(only, () => only.openPopup());
    } else if (filteredPoints.length > 1) {
      map.fitBounds(L.latLngBounds(filteredPoints.map((p) => [p.lat, p.lng] as L.LatLngTuple)).pad(0.2));
    }
  }, [filteredPoints, detailRole]);

  const flyToPoint = (p: CompanyPoint, index: number) => {
    const cluster = clusterRef.current;
    const marker = markersByIdRef.current.get(pointMapKey(p, index));
    if (!cluster || !marker) return;
    cluster.zoomToShowLayer(marker, () => marker.openPopup());
  };

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="absolute inset-0" />

      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className="absolute left-2 top-2 z-[600] flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-lg sm:hidden"
        aria-label="Хайлт, шүүлтүүр"
      >
        {panelOpen ? <HiX size={18} className="text-slate-600" /> : <HiSearch size={18} className="text-slate-600" />}
      </button>

      <div
        className={`absolute left-2 top-14 sm:top-2 z-[500] ${panelOpen ? 'flex' : 'hidden'} sm:flex w-[220px] max-w-[78vw] max-h-[calc(100%-8rem)] sm:max-h-[calc(100%-5.5rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/97 shadow-lg backdrop-blur`}
      >
        <div className="space-y-2 border-b border-slate-100 p-2.5">
          <div className="relative">
            <HiSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="РД, нэр, мэдээлэл хайх..."
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2.5 text-[11.5px] text-slate-700 placeholder:text-slate-400 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            {[
              { key: 'all', label: 'All', count: sourceCounts.all },
              { key: 'report', label: 'Reports', count: sourceCounts.report },
              { key: 'survey', label: 'Survey', count: sourceCounts.survey },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSourceFilter(item.key as 'all' | 'report' | 'survey')}
                className={`min-w-0 rounded-md px-1.5 py-1 text-[10px] font-semibold transition ${
                  sourceFilter === item.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="block truncate">{item.label}</span>
                <span className="block text-[9px] font-medium opacity-70">{item.count}</span>
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[11.5px] text-slate-700 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            <option value="">Бүх төлөв</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {pointStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          <span>Мэдээлэл</span>
          <span>{filteredPoints.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-1.5 pb-2">
          {filteredPoints.length === 0 ? (
            <p className="px-2 py-5 text-center text-[11.5px] text-slate-400">Илэрц олдсонгүй.</p>
          ) : (
            pointGroups.map((group) =>
              group.points.length === 0 ? null : (
                <div key={group.key} className="pb-2">
                  <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 backdrop-blur">
                    <span>{group.label}</span>
                    <span>{group.points.length}</span>
                  </div>
                  {group.points.map((p, index) => {
                    const bucket = scoreBucket(p.score);
                    const isSurvey = p.source === 'survey';
                    const color = SCORE_COLORS[bucket];
                    return (
                      <button
                        key={pointMapKey(p, index)}
                        type="button"
                        onClick={() => flyToPoint(p, index)}
                        className="flex w-full items-start gap-2 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-slate-50"
                      >
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white"
                          style={{ backgroundColor: color }}
                        >
                          <HiOfficeBuilding size={11} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11.5px] font-semibold text-slate-800">{p.company}</span>
                          <span className="block truncate text-[10px] text-slate-400">
                            {p.register}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ),
            )
          )}
        </div>
      </div>

      <aside className="absolute right-2 top-2 z-[500] hidden w-[260px] max-h-[calc(100%-5.5rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/97 shadow-lg backdrop-blur lg:flex">
        <div className="border-b border-slate-100 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Статистик</p>
          <h3 className="mt-0.5 text-sm font-semibold text-slate-900">Тайлангийн мэдээлэл</h3>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {stats.provinceRows.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-400">
              Тайлангийн мэдээлэл алга.
            </p>
          ) : (
            <div className="space-y-4">
              <section>
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <span>Аймаг / хот</span>
                  <span>{stats.provinceRows.length}</span>
                </div>
                <div className="space-y-1.5">
                  {stats.provinceRows.slice(0, 12).map((row) => (
                    <div key={row.province} className="rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-[11.5px] font-semibold text-slate-700">{row.province}</span>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          {row.count}
                        </span>
                      </div>
                    </div>
                  ))}
                  {stats.provinceRows.length > 12 && (
                    <p className="px-1 pt-1 text-[10px] text-slate-400">
                      +{stats.provinceRows.length - 12} more provinces
                    </p>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <span>Сум / дүүрэг</span>
                  <span>{stats.districtRows.length}</span>
                </div>
                <div className="space-y-1.5">
                  {stats.districtRows.slice(0, 24).map((row) => (
                    <div
                      key={`${row.province}-${row.district}`}
                      className="rounded-lg border border-slate-100 bg-white px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-[11.5px] font-semibold text-slate-700">{row.district}</span>
                        <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                          {row.count}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">{row.province}</p>
                    </div>
                  ))}
                  {stats.districtRows.length > 24 && (
                    <p className="px-1 pt-1 text-[10px] text-slate-400">
                      +{stats.districtRows.length - 24} more districts
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>

      <div className="absolute left-2 bottom-2 z-[500] rounded-lg border border-slate-200 bg-white/97 px-2.5 py-2 shadow-lg backdrop-blur">
        <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">Тэмдэглэгээ</p>
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
