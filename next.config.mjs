// Browser hardening for every response. No Content-Security-Policy yet: the
// map (Leaflet) and inline styles would need a nonce roll-out first.
const securityHeaders = [
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
