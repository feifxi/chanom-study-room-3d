import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@connecta/shared'],
};

export default nextConfig;
