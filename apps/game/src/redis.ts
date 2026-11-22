import { Redis } from 'ioredis';
import { GAME_CHANNELS, type GameRoomEvent } from '@connecta/shared';
import { dispatch, links } from './links.js';
import { log } from './log.js';

/**
 * The game server's Redis: room events in from the API (kick, ban, map…), presence and "space"
 * out. Returns a function that closes both connections.
 */
export async function connectRedis(url: string) {
  const pub = new Redis(url, { maxRetriesPerRequest: 2 });
  const sub = new Redis(url, { maxRetriesPerRequest: 2 });
  for (const r of [pub, sub]) r.on('error', (err) => log.warn({ err: err.message }, 'redis'));

  links.presence = (update) => void pub.publish(GAME_CHANNELS.presence, JSON.stringify(update)).catch(() => {});
  links.space = (roomId) => void pub.publish(GAME_CHANNELS.space, JSON.stringify({ roomId })).catch(() => {});

  await sub.subscribe(GAME_CHANNELS.rooms);
  sub.on('message', (_channel, raw) => {
    try {
      dispatch(JSON.parse(raw) as GameRoomEvent);
    } catch (err) {
      log.warn({ err }, 'bad room event');
    }
  });
  return async () => {
    await Promise.allSettled([pub.quit(), sub.quit()]);
  };
}
