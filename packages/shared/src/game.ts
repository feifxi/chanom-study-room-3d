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
  /** null for guests */
  handle: string | null;
  name: string;
  look: AvatarLook | null;
  role: PlayerRole;
  /** How many may be inside at once (the owner's plan and the map size) */
  capacity: number;
  mapId: string;
  /** Timed out until then (epoch ms; 0 = not): no bubbles, typing or voice */
  timedOutUntil: number;
  /** The room lets guests talk (Room settings → Invites); members always can */
  guestVoice: boolean;
}
export const TICKET_AUDIENCE = 'connecta-game';
export const TICKET_SECONDS = 60;

/** Bubbles: said out loud, over your head (feature 6). */
export const BUBBLE_MAX = 120;
/** Fastest you can say bubbles one after another */
export const SAY_COOLDOWN_MS = 400;
/** Typing dots clear themselves if the client goes quiet (a closed tab) */
export const TYPING_TIMEOUT_MS = 6000;
/** What you're focusing on, shown by your name */
export const SUBJECT_MAX = 24;
/** A new look inside a room, at most this often */
export const LOOK_EVERY_MS = 5000;

/** Proximity voice (feature 6): full volume within NEAR metres, silent from FAR. */
export const VOICE_NEAR = 2.5;
export const VOICE_FAR = 9;
/** Voices streamed at once, the nearest: a phone can't take 100 streams */
export const VOICE_MAX = 12;

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
  | { roomId: string; type: 'timeout'; userId: string; until: number }
  | { roomId: string; type: 'map'; mapId: string }
  | { roomId: string; type: 'guestVoice'; on: boolean }
  | { roomId: string; type: 'deleted' };

export interface GamePresence {
  userId: string;
  /** One per connection: game:<session id> */
  tabId: string;
  /** null: gone */
  roomId: string | null;
}

/**
 * What a client sends: `move`, `sit`, `stand` (movement), `say` { text }, `typing` { typing },
 * `status` { status, subject?, endsAt? } (focus, break, away), `stage` { on }, `look` { look },
 * `voice` (asks for a {@link VoicePass}), `deaf` { on }, `mute` { id, on } (owner and mods: Mute
 * for everyone, by session id).
 * What the server sends besides state: `said`, `quiet` and `voice`.
 */
export interface VoicePass {
  /** LiveKit's WebSocket URL */
  url: string;
  /** Joins the LiveKit room named after the Connecta room, as your session id */
  token: string;
}
export interface Said {
  /** The speaker's session id */
  id: string;
  text: string;
}
/** You're timed out: nothing you say or type goes out until then (epoch ms). */
export interface Quiet {
  until: number;
}
