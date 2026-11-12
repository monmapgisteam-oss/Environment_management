import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { backendUrl } from '@/lib/api/config';
import { decodeView } from '@shared/views/encoding';
import type { ViewName, Views } from '@shared/views';

// Server-side calls from the frontend to the backend API. Only server
// components and the proxy use this; the browser calls /api directly (the
// reverse proxy routes it to the backend). The frontend holds no database
// credential or session secret: it forwards the visitor's cookie and the
// backend decides what that visitor may see.

export { backendUrl };

// Request headers passed on to the backend: the session cookie, and where the
// visitor came from (rate limits, QR links that name the public host).
const FORWARDED = ['cookie', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'user-agent', 'accept-language'];

async function forwardedHeaders() {
  const incoming = await headers();
  const result = new Headers();
  for (const name of FORWARDED) {
    const value = incoming.get(name);
    if (value) result.set(name, value);
  }
  if (!result.has('x-forwarded-host') && incoming.get('host')) result.set('x-forwarded-host', incoming.get('host')!);
  return result;
}

export async function backendFetch(path: string, init: RequestInit = {}) {
  const requestHeaders = await forwardedHeaders();
  new Headers(init.headers).forEach((value, name) => requestHeaders.set(name, value));
  return fetch(`${backendUrl()}${path}`, {
    ...init,
    headers: requestHeaders,
    cache: 'no-store',
    signal: init.signal ?? AbortSignal.timeout(30_000),
  });
}

type QueryInput = Record<string, string | string[] | undefined> | URLSearchParams;

function toSearch(query?: QueryInput) {
  if (!query) return '';
  const search = new URLSearchParams();
  if (query instanceof URLSearchParams) query.forEach((value, key) => search.append(key, value));
  else {
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) value.forEach((item) => search.append(key, item));
      else if (value !== undefined) search.set(key, value);
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

// The data of one page view (backend/src/views). A missing record becomes the
// page's 404, a view redirect a redirect, and a session that ended between the
// layout check and this call a trip back to the start page.
export async function loadView<K extends ViewName>(
  name: K,
  options: { params?: Record<string, string>; query?: QueryInput } = {},
): Promise<Views[K]> {
  const path = String(name).replace(/:([A-Za-z]+)/g, (_match, key: string) => encodeURIComponent(options.params?.[key] ?? ''));
  const response = await backendFetch(`/api/views/${path}${toSearch(options.query)}`);
  if (response.status === 404) notFound();
  if (response.status === 401 || response.status === 403) redirect('/');
  if (!response.ok) throw new Error(`View ${String(name)} failed (HTTP ${response.status}).`);
  const data = decodeView<Views[K] | { $redirect: string }>(await response.text());
  if (data && typeof data === 'object' && '$redirect' in data && typeof data.$redirect === 'string') redirect(data.$redirect);
  return data as Views[K];
}
