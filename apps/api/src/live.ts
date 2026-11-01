import type { AdminLive } from '@study/shared';
import { log } from './log';

const TIMEOUT_MS = 1000;

/**
 * Rooms and head counts live in the game process, so the admin overview asks it over the internal
 * network (GET /internal/live, which Caddy never exposes). A slow or down game server must not hang
 * the admin page: give up after a second and show "live data unavailable".
 */
export function gameLive(baseUrl: string) {
  return async (): Promise<AdminLive | null> => {
    try {
      const res = await fetch(`${baseUrl}/internal/live`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as AdminLive;
    } catch (err) {
      log.warn({ err }, 'admin: live data from the game server unavailable');
      return null;
    }
  };
}
