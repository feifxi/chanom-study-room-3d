import { MAPS, type Channel, type MapTemplate, type Room, type Server } from '@/lib/mock';

/**
 * Place layout's model (decided 2026-11-08): no servers, just rooms. A room has one map (from a
 * template), one permanent main chat, its own members, roles, invites and visibility. When full it's
 * full; boosts raise its capacity.
 *
 * The demo's mock data is still shaped as servers (the other layouts use it), so each mock server
 * stands in for one room: its busiest room gives the map and the crowd, its first chat is the main
 * chat. In the real schema `rooms` replaces `servers` outright.
 */

/**
 * Boost levels: boosts needed, people at once, members, and what else unlocks. Members grow with
 * capacity (about 6 members per spot): a room where most members could never fit inside at once
 * feels empty-but-full. Free fits a friend group or a class (150, about Dunbar's number); a big
 * community boosts to grow, up to 1,000.
 */
export const BOOST_LEVELS = [
  { level: 0, boosts: 0, capacity: 25, members: 150, perks: ['Every basic template', '720p screen share', 'Normal uploads'] },
  { level: 1, boosts: 2, capacity: 50, members: 300, perks: ['Premium templates', 'Custom room colours and banner'] },
  { level: 2, boosts: 7, capacity: 100, members: 500, perks: ['1080p screen share for everyone', 'Bigger uploads', 'Animated room icon'] },
  { level: 3, boosts: 14, capacity: 100, members: 1000, perks: ['Custom invite link', 'More private zones and decor', 'Event tools'] },
] as const;

export const levelFor = (boosts: number) => [...BOOST_LEVELS].reverse().find((l) => boosts >= l.boosts)!;

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
  boosts: number;
  capacity: number;
}

export function placeRoom(server: Server): PlaceRoom {
  const scene = [...server.rooms].sort((a, b) => b.people.length - a.people.length)[0]!;
  const boosts = server.boosted ?? 0;
  const people = server.rooms.flatMap((r) => r.people);
  const capacity = levelFor(boosts).capacity;
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
    boosts,
    capacity,
  };
}

export const walkInHref = (r: PlaceRoom) => `/servers/${r.id}/rooms/${r.scene.id}`;
export const chatHref = (r: PlaceRoom) => `/servers/${r.id}`;
