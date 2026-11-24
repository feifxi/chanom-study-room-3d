import type { AvatarLook } from '@connecta/shared';

/**
 * The older shapes the room screen and the avatar still take: the room screen gets the API's room
 * squeezed into `Server` (features/place/model.ts `asServer`), and the avatar a `User`. Replacing them
 * with the API's types is in docs/open-issues.md.
 */

export type Presence = 'online' | 'idle' | 'focus' | 'offline';

export interface User {
  id: string;
  name: string;
  handle: string;
  color: string;
  look: AvatarLook;
  presence: Presence;
  /** What they're doing right now, shown under their name. */
  activity?: string;
  /** Where they are, so friends can join them. */
  inRoom?: { serverId: string; roomId: string };
  /**
   * In a private room you're not a member of. Like Discord, you never learn which room (not its name,
   * map or who else is there), only "in a private room", and you can ask your friend to bring you in.
   */
  inPrivateRoom?: boolean;
  /** For offline friends: "last seen 2h ago". */
  lastSeen?: string;
  plus?: boolean;
}

export type Visibility = 'private' | 'public' | 'request';

export interface Channel {
  id: string;
  name: string;
  topic: string;
  unread?: number;
  mention?: boolean;
}

export interface Room {
  id: string;
  name: string;
  mapId: string;
  capacity: number;
  allowGuests: boolean;
  /** Can anyone start games that invite the whole room (Pick a Side)? Tables, TV and board always work. */
  roomWideGames: boolean;
  /** Who's inside right now. */
  people: string[];
  /** Activities happening in the room (for the sidebar). */
  happening?: string;
}

export interface Server {
  id: string;
  name: string;
  emoji: string;
  tint: string;
  banner: string;
  description: string;
  visibility: Visibility;
  members: string[];
  memberCount: number;
  roles: Record<string, 'Owner' | 'Mod'>;
  channels: Channel[];
  rooms: Room[];
  /** The owner has Connecta Plus: the room fits 100 and gets Big and premium maps. */
  ownerPlus?: boolean;
  event?: string;
  /** When you were last there, as shown on Home ("2h ago"). */
  lastActive?: string;
  /** Days since you were last there; Home folds rooms quiet for 30+ days away. */
  idleDays?: number;
}

/** Common rooms open on the room screen like a room with no chats (CommonWalkIn adds the copy you're in) */
export const PUBLIC_SERVER: Server = {
  id: 'public',
  name: 'Common rooms',
  emoji: '🌏',
  tint: 'bg-sky',
  banner: 'from-[#dfeeff] via-[#e3f5ea] to-[#efe4ff]',
  description: 'Run by Connecta, open to everyone. Text only. Be kind.',
  visibility: 'public',
  members: [],
  memberCount: 0,
  roles: {},
  channels: [],
  rooms: [],
};
