import type { FocusRound, GamePresence, GameRoomEvent, GameWalkedIn, QuestEvent } from '@connecta/shared';

/**
 * What the room reports outward and listens to, wired by the entry point (Redis in the real server,
 * plain functions in tests), so the room itself never imports a Redis client.
 */
export interface Links {
  /** Tell the gateway who's in which room (presence, docs/features/03-friends.md) */
  presence(update: GamePresence): void;
  /** A member's focus round of 1+ minute ended: the API saves it (a job, so it survives an API restart) */
  focusRound(round: FocusRound): void;
  /** Someone walked into a room: any other room they're in, on any game server, lets them go */
  walkedIn(event: GameWalkedIn): void;
  /** Something a daily quest counts (a bubble, a pet, a finished game…): the API counts it (a job) */
  quest(event: QuestEvent): void;
}

export const links: Links = { presence: () => {}, focusRound: () => {}, walkedIn: () => {}, quest: () => {} };

interface LiveRoom {
  apply(event: GameRoomEvent): void;
  walkedIn(event: GameWalkedIn): void;
}

/** The live rooms in this process, by Connecta room id, so API events reach the right one. */
export const liveRooms = new Map<string, LiveRoom>();

export function dispatch(event: GameRoomEvent) {
  // '*': every room (a new look shows wherever you are)
  if (event.roomId === '*') for (const room of liveRooms.values()) room.apply(event);
  else liveRooms.get(event.roomId)?.apply(event);
}

/** Every room hears it; each lets the person go unless it's the room they walked into. */
export function dispatchWalkedIn(event: GameWalkedIn) {
  for (const room of liveRooms.values()) room.walkedIn(event);
}
