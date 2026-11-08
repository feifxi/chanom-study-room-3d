import { MAPS, type Channel, type MapTemplate, type Room, type Server } from '@/lib/mock';

/**
 * Place layout's model (decided 2026-11-08): no servers, just rooms. A room has one map (from a
 * template), one permanent main chat, its own members, roles, invites and visibility. When full it's
 * full; the owner's Plus raises its capacity.
 *
 * The demo's mock data is still shaped as servers (the other layouts use it), so each mock server
 * stands in for one room: its busiest room gives the map and the crowd, its first chat is the main
 * chat. In the real schema `rooms` replaces `servers` outright.
 */

/**
 * One subscription, Connecta Plus (decided 2026-11-09; room boosts dropped). A room
 * follows its owner's plan. Members grow with capacity (about 6 per spot inside), so a room never has
 * far more members than could ever fit: Free fits a friend group or a class, Plus a community.
 */
export const PLANS = {
  free: { name: 'Free', capacity: 25, members: 150 },
  plus: { name: 'Plus', capacity: 100, members: 1000 },
} as const;

export const planOf = (ownerPlus: boolean) => PLANS[ownerPlus ? 'plus' : 'free'];

export interface PlaceRoom {
  id: string;
  name: string;
  emoji: string;
  tint: string;
  description: string;
  server: Server;
  map: MapTemplate;
  /** The 3D room to load (the mock server's busiest room). */
  scene: Room;
  /** People you know inside right now (faces on the card). */
  people: string[];
  /** How many are inside in total, strangers included. */
  inside: number;
  /** When it's full, it's full: Walk in waits for a spot (the chat still works). */
  full: boolean;
  /** Your role here; no role means a member. */
  myRole?: 'Owner' | 'Mod';
  chat?: Channel;
  /** The room follows its owner's plan. */
  ownerPlus: boolean;
  capacity: number;
}

export function placeRoom(server: Server): PlaceRoom {
  const scene = [...server.rooms].sort((a, b) => b.people.length - a.people.length)[0]!;
  const ownerPlus = !!server.ownerPlus;
  const people = server.rooms.flatMap((r) => r.people);
  const capacity = planOf(ownerPlus).capacity;
  const inside = Math.max(people.length, server.insideCount ?? 0);
  const role = server.roles.me;
  return {
    id: server.id,
    name: server.name,
    emoji: server.emoji,
    tint: server.tint,
    description: server.description,
    server,
    map: MAPS.find((m) => m.id === scene.mapId)!,
    scene,
    people,
    inside,
    full: inside >= capacity,
    myRole: role === 'Owner' ? 'Owner' : role === 'Mod' ? 'Mod' : undefined,
    chat: server.channels[0],
    ownerPlus,
    capacity,
  };
}

export const walkInHref = (r: PlaceRoom) => `/servers/${r.id}/rooms/${r.scene.id}`;
export const chatHref = (r: PlaceRoom) => `/servers/${r.id}`;
