import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Self-hosted in Docker: emit a minimal standalone server.
  output: 'standalone',
  devIndicators: { position: 'bottom-right' },
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@study/shared'],
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
