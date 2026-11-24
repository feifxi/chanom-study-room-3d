import type { Room } from '@/features/rooms/useRooms';
import { mapFor } from '@/features/place/model';

/** What the room screen shows: one of Connecta's rooms (from the API), or a copy of a Common room. */
export interface RoomHere {
  /** The room's id, or the Common copy's */
  id: string;
  name: string;
  emoji: string;
  /** The room card's colour */
  tint: string;
  /** The map it opened on (the owner can switch it while you're inside) */
  mapId: string;
  /** Can anyone start games that invite the whole room (Pick a Side)? Tables, TV and board always work. */
  roomWideGames: boolean;
  /** A Common room: run by Connecta, open to everyone, text only (docs/features/13-common-rooms.md) */
  common: boolean;
  /** You're its owner or a mod (the chat's moderation) */
  moderator: boolean;
}

export const roomHere = (room: Room): RoomHere => ({
  id: room.id,
  name: room.name,
  emoji: room.emoji,
  tint: mapFor(room.mapId).tint,
  mapId: room.mapId,
  roomWideGames: room.roomWideGames,
  common: false,
  moderator: room.me.role === 'owner' || room.me.role === 'mod',
});
