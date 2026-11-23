import type { FocusRound, GameFocusStarted, GamePresence, GameRoomEvent } from '@connecta/shared';

/**
 * What the room reports outward and listens to, wired by the entry point (Redis in the real server,
 * plain functions in tests), so the room itself never imports a Redis client.
 */
export interface Links {
  /** Tell the gateway who's in which room (presence, feature 5) */
  presence(update: GamePresence): void;
  /** A room that was full has space again ("Full · notify me") */
  space(roomId: string): void;
  /** A member's focus round of 1+ minute ended: the API saves it (a job, so it survives an API restart) */
  focusRound(round: FocusRound): void;
  /** Someone started a timer: their timer in any other room, on any game server, ends */
  focusStarted(event: GameFocusStarted): void;
}

export const links: Links = { presence: () => {}, space: () => {}, focusRound: () => {}, focusStarted: () => {} };

interface LiveRoom {
  apply(event: GameRoomEvent): void;
  focusStarted(event: GameFocusStarted): void;
}

/** The live rooms in this process, by Connecta room id, so API events reach the right one. */
export const liveRooms = new Map<string, LiveRoom>();

export function dispatch(event: GameRoomEvent) {
  liveRooms.get(event.roomId)?.apply(event);
}

/** Every room hears it; each ends the person's timer unless it's the room they started it in. */
export function dispatchFocus(event: GameFocusStarted) {
  for (const room of liveRooms.values()) room.focusStarted(event);
}
