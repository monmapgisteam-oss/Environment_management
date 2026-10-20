import L from 'leaflet';

// Branded map markers + popups shared by every Leaflet map in the app.

export function createPinIcon(color: string, size: 'lg' | 'md' = 'md'): L.DivIcon {
  const w = size === 'lg' ? 34 : 26;
  const h = Math.round(w * 1.36);
  return L.divIcon({
    className: 'map-pin-icon',
    html: `
      <svg width="${w}" height="${h}" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 4px rgba(15,23,42,0.35));">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="${color}"/>
        <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
      </svg>
    `,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 6],
  });
}

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(v: unknown): string {
  return esc(v).replace(/"/g, '&quot;');
}

export type PopupRow = [label: string, value: unknown];

export function popupCard(opts: {
  title: string;
  accent?: string;
  badge?: string;
  badgeClass?: string;
  rows: PopupRow[];
  images?: { src: string; alt?: string }[];
  empty?: string;
  link?: { label: string; href: string };
}): string {
  const {
    title,
    accent = '#0F766E',
    badge,
    badgeClass,
    rows,
    images = [],
    empty = 'Мэдээлэл алга',
    link,
  } = opts;
  const body = rows
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(
      ([label, v]) =>
        `<div class="map-popup-row"><span class="map-popup-label">${esc(label)}</span><span class="map-popup-value">${esc(v)}</span></div>`,
    )
    .join('');
  const media = images
    .slice(0, 4)
    .map(
      (image) =>
        `<a href="${escAttr(image.src)}" target="_blank" rel="noreferrer" class="map-popup-photo-link"><img src="${escAttr(image.src)}" alt="${escAttr(image.alt || title)}" class="map-popup-photo" loading="lazy" /></a>`,
    )
    .join('');

  return `
    <div class="map-popup">
      <div class="map-popup-header" style="border-left-color:${accent}">
        <span class="map-popup-title">${esc(title)}</span>
        ${badge ? `<span class="${badgeClass || 'map-popup-badge'}">${esc(badge)}</span>` : ''}
      </div>
      <div class="map-popup-body">${body || `<div class="map-popup-empty">${esc(empty)}</div>`}${media ? `<div class="map-popup-photos">${media}</div>` : ''}</div>
      ${link ? `<a href="${escAttr(link.href)}" class="map-popup-link">${esc(link.label)}</a>` : ''}
    </div>
  `;
}

export type ScoreBucket = 'good' | 'medium' | 'low' | 'none';

export const SCORE_COLORS: Record<ScoreBucket, string> = {
  good: '#16A34A',
  medium: '#D97706',
  low: '#DC2626',
  none: '#94A3B8',
};

export const SCORE_LABELS: Record<ScoreBucket, string> = {
  good: 'Сайн (≥ 80)',
  medium: 'Дунд (50–79)',
  low: 'Муу (< 50)',
  none: 'Үнэлгээгүй',
};

export function scoreBucket(score: number | null | undefined): ScoreBucket {
  if (score === null || score === undefined) return 'none';
  if (score >= 80) return 'good';
  if (score >= 50) return 'medium';
  return 'low';
}
