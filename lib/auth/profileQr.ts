import { headers } from 'next/headers';
import QRCode from 'qrcode';

// QR code as an SVG data URL, drawn on the server. No outside QR service sees
// the link, and printed pages do not depend on one being reachable.
export async function createQrImageUrl(data: string, size = 220) {
  const svg = await QRCode.toString(data, { type: 'svg', width: size, margin: 2, errorCorrectionLevel: 'M' });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function getPublicProfileQrUrl(userId: string) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  const configuredBaseUrl = configuredUrl ? normalizeBaseUrl(configuredUrl) : '';
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/qr/profile/${userId}`;
  }

  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || 'localhost:3000';
  const protocol =
    headerStore.get('x-forwarded-proto') ||
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  return `${protocol}://${host}/qr/profile/${userId}`;
}
