import type { AvatarLook } from './avatar.js';
import type { PlayerRole } from './player.js';

/**
 * The game server's protocol (build step 4): one Colyseus room per Connecta room. The web app gets a
 * signed ticket from the API (`POST /api/rooms/:id/ticket`) and joins with it; the game server checks
 * the signature and never reads the database.
 */

export const GAME_ROOM = 'room';
/** The join option naming the Connecta room (Colyseus reserves `roomId`). */
export type GameJoinOptions = { place: string; ticket: string };

/** What a ticket vouches for (signed by the API with GAME_SECRET, valid about a minute). */
export interface GameTicket {
  /** The account */
  sub: string;
  roomId: string;
  name: string;
  look: AvatarLook | null;
  role: PlayerRole;
  /** How many may be inside at once (the owner's plan and the map size) */
  capacity: number;
  mapId: string;
}
export const TICKET_AUDIENCE = 'connecta-game';
export const TICKET_SECONDS = 60;

/** How long the game server waits for a dropped connection to come back before you leave. */
export const RECONNECT_SECONDS = 20;

/** Why the game server closed your connection (WebSocket close codes 4000–4999 are ours). */
export const GAME_CLOSE = {
  /** Removed by the owner or a mod */
  kicked: 4001,
  banned: 4002,
  /** You opened the room in another tab: one of you per room */
  elsewhere: 4003,
  /** The room was deleted, or you left it */
  gone: 4004,
} as const;

/** Redis channels between the API and the game server. */
export const GAME_CHANNELS = {
  /** API → game: something about a room changed ({@link GameRoomEvent}) */
  rooms: 'game:rooms',
  /** Game → gateway: who's in which room, per connection (presence, feature 5) */
  presence: 'game:presence',
  /** Game → API: a full room has space again ("Full · notify me") */
  space: 'game:space',
} as const;

export type GameRoomEvent =
  | { roomId: string; type: 'kick' | 'ban' | 'left'; userId: string }
  | { roomId: string; type: 'role'; userId: string; role: PlayerRole }
  | { roomId: string; type: 'map'; mapId: string }
  | { roomId: string; type: 'deleted' };

export interface GamePresence {
  userId: string;
  /** One per connection: game:<session id> */
  tabId: string;
  /** null: gone */
  roomId: string | null;
}
