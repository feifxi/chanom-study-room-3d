import type { NextConfig } from 'next';

// Where the API listens, seen from this server: localhost:4000 in development, the api container
// in production. The browser never uses it: it calls /api on this origin, so cookies need no CORS.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
// The live gateway (chat, typing, presence), reached the same way at /live
const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:4001';
// The game server (walking in, activities) at /game: matchmaking over HTTP, then a WebSocket
const GAME_URL = process.env.GAME_URL ?? 'http://localhost:4002';

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ['@connecta/shared'],
  // In production nginx sends /api to the API before it reaches Next; this does the same locally
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      // Socket.IO, polling and the WebSocket upgrade (Next proxies upgrades on external rewrites)
      { source: '/live', destination: `${GATEWAY_URL}/live` },
      // The game server knows nothing of the prefix (nginx strips it the same way)
      { source: '/game/:path*', destination: `${GAME_URL}/:path*` },
    ];
  },
};

export default nextConfig;
