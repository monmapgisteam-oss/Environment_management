const isDev = process.env.NODE_ENV !== 'production';

// Content-Security-Policy: pages may load scripts and data only from this site,
// plus the few outside services the app uses (Esri map tiles, the QR image,
// Google Fonts, OpenStreetMap address lookup). Next.js injects inline scripts
// and Leaflet sets inline styles, so 'unsafe-inline' stays until a nonce
// roll-out; dev also needs eval and the hot-reload socket.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://server.arcgisonline.com",
  `connect-src 'self' https://nominatim.openstreetmap.org${isDev ? ' ws: wss:' : ''}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

// Browser hardening for every response.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    // No page uses next/image, so the optimiser accepts no remote hosts.
    remotePatterns: [],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  experimental: {
    // Dev-only React debug channel. On Firefox, Next mistakes a still-streaming
    // document for a cached one (performance transferSize === 0) and calls
    // location.reload() on every load, so signed-in pages loop forever.
    reactDebugChannel: false,
  },
};

export default nextConfig;
