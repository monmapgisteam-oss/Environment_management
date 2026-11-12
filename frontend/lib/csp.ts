// Content-Security-Policy for every page, built per request by proxy.ts.
// Scripts run only with this request's nonce (Next.js adds it to its own
// scripts; the root layout adds it to the theme script), so injected inline
// script cannot run. Data and assets come only from this site plus the few
// outside services the app uses (Esri map tiles, Google Fonts, OpenStreetMap
// address lookup). Leaflet sets inline styles, so styles keep 'unsafe-inline';
// development also needs eval and the hot-reload socket.
export function contentSecurityPolicy(nonce: string, isDev = process.env.NODE_ENV !== 'production') {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://server.arcgisonline.com",
    `connect-src 'self' https://nominatim.openstreetmap.org${isDev ? ' ws: wss:' : ''}`,
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function newNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
}
