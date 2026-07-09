import { headers } from 'next/headers';

export function createQrImageUrl(data: string, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=14&data=${encodeURIComponent(data)}`;
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function getPublicStaffQrUrl(userId: string) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  const configuredBaseUrl = configuredUrl ? normalizeBaseUrl(configuredUrl) : '';
  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/qr/staff/${userId}`;
  }

  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || 'localhost:3000';
  const protocol =
    headerStore.get('x-forwarded-proto') ||
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  return `${protocol}://${host}/qr/staff/${userId}`;
}
