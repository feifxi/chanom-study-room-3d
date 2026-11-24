import { randomBytes } from 'node:crypto';

/**
 * What every seed file shares: who's who, the rooms' fixed ids, times relative to the run, and
 * time-ordered ids that the seed can find again.
 */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
/** Every seed person lives in Thailand, so their focus days and quests start at Bangkok's midnight */
export const TIME_ZONE = 'Asia/Bangkok';

/** The run's "now": every seeded time is relative to it, so "the last 24 hours" always has something */
export const NOW = Date.now();
export const ago = (ms: number) => new Date(NOW - ms);

/** Stable ids, so every seed file can point at the same people */
export const seedUserId = (handle: string) => `seed_${handle.replace('.', '_')}`;

export const id = {
  fei: seedUserId('fei'),
  ter: seedUserId('ter'),
  view: seedUserId('view'),
  ploy: seedUserId('ployy'),
  nam: seedUserId('namwhan'),
  bow: seedUserId('bowbow'),
  pim: seedUserId('pimmy'),
  mook: seedUserId('mookie'),
  earth: seedUserId('earth.k'),
};
export type Who = keyof typeof id;
export const SEED_USERS = Object.values(id);

/** Fixed, so a rerun replaces them (rooms are /r/<id>, 10 characters like real ones) */
export const ROOM = {
  chanom: 'seedchanom',
  cpe: 'seedcpeyr3',
  games: 'seedgamenc',
  lofi: 'seedlofish',
} as const;
export const SEED_ROOMS = Object.values(ROOM);

/**
 * Seed rows whose ids are UUIDv7 (messages, reports, the audit log, the inbox) end in this, so the
 * next run finds and replaces them without touching what you made yourself.
 */
export const MARK = '5eed5eed5eed';

/** A UUIDv7 for a moment in time (ids sort by time: chat pages and the audit log rely on it), marked as seed */
export function seedUuid(at: Date | number): string {
  const ms = BigInt(typeof at === 'number' ? at : at.getTime());
  const time = ms.toString(16).padStart(12, '0');
  const rand = randomBytes(4).toString('hex');
  // version 7, then the variant bits (8–b), then the marker
  return `${time.slice(0, 8)}-${time.slice(8)}-7${rand.slice(0, 3)}-${(8 + (parseInt(rand[3]!, 16) % 4)).toString(16)}${rand.slice(4, 7)}-${MARK}`;
}

/** A small seeded random, so every run makes the same history */
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
