const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    // Dev-only React debug channel. On Firefox, Next mistakes a still-streaming
    // document for a cached one (performance transferSize === 0) and calls
    // location.reload() on every load, so signed-in pages loop forever.
    reactDebugChannel: false,
  },
};

export default nextConfig;
