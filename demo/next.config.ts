import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@study/shared'],
};

export default nextConfig;
