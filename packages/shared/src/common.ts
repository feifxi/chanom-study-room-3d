import type { MapId } from './rooms.js';

/**
 * Common rooms (feature 14): Connecta's own rooms, one per template, open to anyone, guests too.
 * Nobody runs them, so they're text only for everyone. Copies open as they fill and close when empty.
 */
export const COMMON_TYPES = [
  { id: 'library', name: 'Library', mapId: 'library', vibe: 'Quiet study', roomWideGames: false },
  { id: 'cafe', name: 'Cat Café', mapId: 'cafe', vibe: 'Chill and chat', roomWideGames: true },
  { id: 'rooftop', name: 'Starry Rooftop', mapId: 'rooftop', vibe: 'Late-night talks', roomWideGames: true },
] as const satisfies readonly { id: string; name: string; mapId: MapId; vibe: string; roomWideGames: boolean }[];
export type CommonTypeId = (typeof COMMON_TYPES)[number]['id'];
export type CommonType = (typeof COMMON_TYPES)[number];
export const COMMON_TYPE_IDS = COMMON_TYPES.map((t) => t.id) as CommonTypeId[];
export const commonType = (id: string): CommonType | undefined => COMMON_TYPES.find((t) => t.id === id);

/** People in one copy at most */
export const COMMON_CAPACITY = 25;
/** Of those, seats only for people joining a friend inside: strangers are placed up to 20 */
export const COMMON_FRIEND_SEATS = 5;
/** Slow mode for everyone: one bubble every 3 s */
export const COMMON_SAY_MS = 3000;

const PREFIX = 'common-';
/** A copy's room id on the game server and in presence: common-library-2 */
export const commonCopyId = (type: CommonTypeId, n: number) => `${PREFIX}${type}-${n}`;
/** The type and number of a copy id, or null for an ordinary room */
export function parseCommonCopy(id: string): { type: CommonType; n: number } | null {
  if (!id.startsWith(PREFIX)) return null;
  const [typeId, num] = [id.slice(PREFIX.length, id.lastIndexOf('-')), Number(id.slice(id.lastIndexOf('-') + 1))];
  const type = commonType(typeId);
  return type && Number.isInteger(num) && num > 0 ? { type, n: num } : null;
}
/** "Library Common Room #2" */
export const commonCopyName = (type: CommonType, n: number) => `${type.name} Common Room #${n}`;
