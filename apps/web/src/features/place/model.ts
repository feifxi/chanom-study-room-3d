import type { RoomRole, Visibility } from '@connecta/shared';
import type { Person, Room } from '@/features/rooms/useRooms';
import { MAPS, type MapTemplate, type Server } from '@/lib/mock';

/**
 * Place layout's model (decided 2026-11-08): no servers, just rooms. A room has one map (from a
 * template), one permanent chat, its own members, roles, invites and visibility. When full it's
 * full; the owner's Plus raises its capacity.
 *
 * `PlaceRoom` is a room from the API plus what the screens show about it. Who's inside is the API's
 * live presence (members see it; feature 5).
 */
export interface PlaceRoom {
  id: string;
  name: string;
  emoji: string;
  tint: string;
  description: string;
  /** The room as the API sent it: settings, owner, mods, your place in it. */
  room: Room;
  map: MapTemplate;
  /** Who's inside right now (faces on the card). */
  people: Person[];
  /** How many are inside in total, strangers included. */
  inside: number;
  /** When it's full, it's full: Walk in waits for a spot (the chat still works). */
  full: boolean;
  /** Your role here; null when you're not a member (a preview, or a guest pass). */
  myRole: RoomRole | null;
  /** The owner or a mod: sees Room settings. */
  canEdit: boolean;
  visibility: Visibility;
  /** The room follows its owner's plan. */
  ownerPlus: boolean;
  capacity: number;
}

export const mapFor = (mapId: string): MapTemplate => MAPS.find((m) => m.id === mapId) ?? MAPS[0]!;

export function placeRoom(room: Room): PlaceRoom {
  const map = mapFor(room.mapId);
  const inside = room.inside.length;
  return {
    id: room.id,
    name: room.name,
    emoji: room.emoji,
    tint: map.tint,
    description: room.description,
    room,
    map,
    people: room.inside,
    inside,
    full: inside >= room.capacity,
    myRole: room.me.role,
    canEdit: room.me.role === 'owner' || room.me.role === 'mod',
    visibility: room.visibility,
    ownerPlus: room.ownerPlus,
    capacity: room.capacity,
  };
}

/** How each role reads in the app. */
export const ROLE_LABEL: Record<RoomRole, string> = { owner: 'Owner', mod: 'Mod', member: 'Member' };

/**
 * The room in the demo's old shape, for the parts still on mock data: the room's chat (build step 3)
 * and walking in (step 4). Goes when they're ported (docs/v2-plan.md, port checklist).
 */
export function asServer(room: Room): Server {
  const role = room.me.role === 'owner' ? 'Owner' : room.me.role === 'mod' ? 'Mod' : undefined;
  return {
    id: room.id,
    name: room.name,
    emoji: room.emoji,
    tint: mapFor(room.mapId).tint,
    banner: 'from-[#ffe9d6] via-[#efe4ff] to-[#dfeeff]',
    description: room.description,
    visibility: room.visibility === 'open' ? 'public' : room.visibility,
    members: ['me'],
    memberCount: room.memberCount,
    roles: role ? { me: role } : {},
    channels: [{ id: 'chat', name: 'chat', topic: '' }],
    rooms: [
      {
        id: room.mapId,
        name: room.name,
        mapId: room.mapId,
        capacity: room.capacity,
        allowGuests: room.allowGuests,
        roomWideGames: room.roomWideGames,
        people: [],
      },
    ],
    ownerPlus: room.ownerPlus,
  };
}

export const walkInHref = (r: Pick<PlaceRoom, 'id'>) => `/r/${r.id}/walk`;
export const chatHref = (r: Pick<PlaceRoom, 'id'>) => `/r/${r.id}`;
