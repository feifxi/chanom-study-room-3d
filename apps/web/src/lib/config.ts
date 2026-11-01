/** Base URL of the Colyseus game server (HTTP; the SDK upgrades to WebSocket). */
export const GAME_URL = process.env.NEXT_PUBLIC_GAME_URL ?? 'http://localhost:2567';

/**
 * The REST API (stats, leaderboard, feedback, admin) is same-origin: Caddy routes /api/* to it in
 * production and next.config.ts rewrites it in dev. No CORS, and the admin cookie stays first-party.
 */
export const API_URL = '/api';
