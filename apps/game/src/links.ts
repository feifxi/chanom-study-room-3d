import type { GamePresence, GameRoomEvent } from '@connecta/shared';

/**
 * What the room reports outward and listens to, wired by the entry point (Redis in the real server,
 * plain functions in tests), so the room itself never imports a Redis client.
 */
export interface Links {
  /** Tell the gateway who's in which room (presence, feature 5) */
  presence(update: GamePresence): void;
  /** A room that was full has space again ("Full · notify me") */
  space(roomId: string): void;
}

export const links: Links = { presence: () => {}, space: () => {} };

/** The live rooms in this process, by Connecta room id, so API events reach the right one. */
export const liveRooms = new Map<string, { apply(event: GameRoomEvent): void }>();

export function dispatch(event: GameRoomEvent) {
  liveRooms.get(event.roomId)?.apply(event);
}
