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
};

export default nextConfig;
