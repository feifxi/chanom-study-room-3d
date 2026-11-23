import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { FOCUS_QUEUE, GAME_CHANNELS, type FocusRound, type GameRoomEvent, type GameWalkedIn } from '@connecta/shared';
import { dispatch, dispatchWalkedIn, links } from './links.js';
import { log } from './log.js';

/**
 * The game server's Redis: room events in from the API (kick, ban, map…), presence and "space"
 * out, focus rounds to the API's queue, and "walked in" between game servers (one room at a time). Returns a
 * function that closes everything.
 */
export async function connectRedis(url: string, env: string) {
  const pub = new Redis(url, { maxRetriesPerRequest: 2 });
  const sub = new Redis(url, { maxRetriesPerRequest: 2 });
  // BullMQ wants its connection to retry forever (maxRetriesPerRequest: null)
  const queueRedis = new Redis(url, { maxRetriesPerRequest: null });
  for (const r of [pub, sub, queueRedis]) r.on('error', (err) => log.warn({ err: err.message }, 'redis'));
  // The API's worker saves the rounds; same prefix as the API's BullMQ (app.module.ts), so each environment keeps its own
  const rounds = new Queue<FocusRound>(FOCUS_QUEUE, {
    connection: queueRedis,
    prefix: `connecta:${env}`,
    defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true, removeOnFail: 1000 },
  });
  rounds.on('error', (err) => log.warn({ err: err.message }, 'focus queue'));

  links.presence = (update) => void pub.publish(GAME_CHANNELS.presence, JSON.stringify(update)).catch(() => {});
  links.space = (roomId) => void pub.publish(GAME_CHANNELS.space, JSON.stringify({ roomId })).catch(() => {});
  links.walkedIn = (event) => void pub.publish(GAME_CHANNELS.walkedIn, JSON.stringify(event)).catch(() => {});
  links.focusRound = (round) =>
    void rounds.add('round', round, { jobId: round.id }).catch((err: unknown) => log.warn({ err, round }, 'focus round not queued'));

  await sub.subscribe(GAME_CHANNELS.rooms, GAME_CHANNELS.walkedIn);
  sub.on('message', (channel, raw) => {
    try {
      if (channel === GAME_CHANNELS.walkedIn) dispatchWalkedIn(JSON.parse(raw) as GameWalkedIn);
      else dispatch(JSON.parse(raw) as GameRoomEvent);
    } catch (err) {
      log.warn({ err }, 'bad room event');
    }
  });
  return async () => {
    await Promise.allSettled([pub.quit(), sub.quit(), rounds.close().then(() => queueRedis.quit())]);
  };
}
