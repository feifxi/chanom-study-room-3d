import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Self-hosted in Docker: emit a minimal standalone server.
  output: 'standalone',
  // The dev badge would sit on top of the room's zoom control
  devIndicators: false,
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@study/shared'],
  // The REST API is same-origin under /api. In production Caddy routes it before it reaches Next;
  // in dev this proxies it to apps/api, so the browser code is the same in both.
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return [];
    return [{ source: '/api/:path*', destination: `${process.env.API_DEV_URL ?? 'http://localhost:2568'}/api/:path*` }];
  },
};

export default nextConfig;
