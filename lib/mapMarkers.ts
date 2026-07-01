import L from 'leaflet';

// Branded map markers + popups shared by every Leaflet map in the app
// (MapPicker, CompanyMap), so pins and popup cards look consistent
// everywhere instead of each component styling its own.

/**
 * Teardrop pin rendered as an inline SVG divIcon (crisp at any zoom, unlike
 * the default Leaflet raster marker). `color` is the fill; a white dot sits
 * in the center so pins stay legible when several share a color.
 */
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

export type PopupRow = [label: string, value: unknown];

/**
 * Card-style popup body matching the app's design system (teal accent,
 * slate text, rounded surfaces) instead of Leaflet's plain default popup.
 * Pair with the `.leaflet-popup*` overrides in globals.css.
 */
export function popupCard(opts: {
  title: string;
  accent?: string;
  badge?: string;
  // Class name for the badge pill (e.g. one of globals.css's `.badge-*`
  // status colors) instead of the default flat teal `.map-popup-badge`.
  badgeClass?: string;
  rows: PopupRow[];
  empty?: string;
  // Optional call-to-action rendered at the bottom of the card (plain <a>,
  // since Leaflet popup content is static HTML, not React).
  link?: { label: string; href: string };
}): string {
  const { title, accent = '#0F766E', badge, badgeClass, rows, empty = 'Мэдээлэл алга', link } = opts;
  const body = rows
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
    .map(
      ([label, v]) =>
        `<div class="map-popup-row"><span class="map-popup-label">${esc(label)}</span><span class="map-popup-value">${esc(v)}</span></div>`,
    )
    .join('');

  return `
    <div class="map-popup">
      <div class="map-popup-header" style="border-left-color:${accent}">
        <span class="map-popup-title">${esc(title)}</span>
        ${badge ? `<span class="${badgeClass || 'map-popup-badge'}">${esc(badge)}</span>` : ''}
      </div>
      <div class="map-popup-body">${body || `<div class="map-popup-empty">${esc(empty)}</div>`}</div>
      ${link ? `<a href="${esc(link.href)}" class="map-popup-link">${esc(link.label)}</a>` : ''}
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
