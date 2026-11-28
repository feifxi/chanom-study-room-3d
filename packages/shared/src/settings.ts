import { COMMON_CAPACITY, COMMON_FRIEND_SEATS } from './common.js';

/**
 * What the Connecta team sets on the admin site (Moderation and Common rooms). The database holds
 * it; the API keeps the whole set in Redis ({@link settingsKey}) and publishes it on every change
 * ({@link settingsChannel}), so each API process and game server applies it at once.
 */
export interface PlatformSettings {
  /** The word filter, everywhere (rooms can still turn it off for themselves; Common rooms can't) */
  wordFilter: boolean;
  /** Our own words on top of the English list, Thai included */
  words: string[];
  /** The automatic steps from reports (muted 15 minutes, out of Common rooms for an hour) */
  reportSteps: boolean;
  /** OpenAI's check on chat pictures (only when the key is set) */
  pictureCheck: boolean;
  /** People in one Common room copy at most */
  commonCapacity: number;
  /** Of those, seats only for people joining a friend inside */
  commonFriendSeats: number;
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  wordFilter: true,
  words: [],
  reportSteps: true,
  pictureCheck: true,
  commonCapacity: COMMON_CAPACITY,
  commonFriendSeats: COMMON_FRIEND_SEATS,
};

/** Each environment its own, so tests never change a running dev server's settings */
export const settingsKey = (env: string) => `connecta:${env}:settings`;
export const settingsChannel = (env: string) => `connecta:${env}:settings`;

/** How full a Common room copy can be set on the admin site: never past the 30 a map is built for */
export const COMMON_CAPACITY_RANGE = { min: 5, max: 30 } as const;
