import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isDev = process.env.NODE_ENV !== 'production';

// Browser hardening for every response.
// The Content-Security-Policy is set per request in proxy.ts (lib/csp.ts),
// because it carries a fresh script nonce.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  // A private system: keep it out of search engines.
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

// The repository root: pages import ../shared, which Next.js must be allowed
// to compile and to copy into the standalone server.
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendUrl = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `next build` writes a self-contained server for the Docker image.
  output: 'standalone',
  outputFileTracingRoot: repositoryRoot,
  turbopack: { root: repositoryRoot },
  images: {
    // No page uses next/image, so the optimiser accepts no remote hosts.
    remotePatterns: [],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  // Local `npm run dev` only: forward /api to the backend. In production the
  // reverse proxy routes /api; a rewrite here would let requests that miss the
  // proxy's rules (e.g. "/API/...", matched without case) reach the backend
  // past them.
  async rewrites() {
    return isDev ? [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }] : [];
  },
  experimental: {
    // Dev-only React debug channel. On Firefox, Next mistakes a still-streaming
    // document for a cached one (performance transferSize === 0) and calls
    // location.reload() on every load, so signed-in pages loop forever.
    reactDebugChannel: false,
  },
};

export default nextConfig;
