import { OBSTACLES, SEATS, SEAT_BY_ID, type Seat } from '@study/shared';

/**
 * Activity spots: the places in a map where activities happen (standard kit, feature 7). Every
 * activity follows the same flow (feature 9): Free → Gathering → Playing → Results.
 *
 * The demo adds a round game table to V1's library here instead of in `@study/shared`, so V1 stays
 * as it was. Once maps are data, spots come from the map file.
 */

/** Round game table, front right: four stools, one per player. */
export const GAME_TABLE = { x: 6.2, z: 4.9, r: 0.62 } as const;
const STOOL_DISTANCE = 1.0;
const STAND_BACK = 0.5;

export const GAME_SEATS: Seat[] = [0, 1, 2, 3].map((i) => {
  // Diagonal stools read better from the isometric camera than a plus shape
  const a = Math.PI / 4 + (i * Math.PI) / 2;
  const dx = Math.sin(a);
  const dz = Math.cos(a);
  return {
    id: `game-${i}`,
    kind: 'chair',
    tableId: 'game',
    x: GAME_TABLE.x + dx * STOOL_DISTANCE,
    z: GAME_TABLE.z + dz * STOOL_DISTANCE,
    // Face the middle of the table
    yaw: a + Math.PI,
    out: { x: GAME_TABLE.x + dx * (STOOL_DISTANCE + STAND_BACK), z: GAME_TABLE.z + dz * (STOOL_DISTANCE + STAND_BACK) },
  };
});

export const isGameSeat = (seatId: string) => seatId.startsWith('game-');

// Register the table with the shared seats and collisions once (module state survives hot reloads)
if (!SEAT_BY_ID.has('game-0')) {
  SEATS.push(...GAME_SEATS);
  for (const s of GAME_SEATS) (SEAT_BY_ID as Map<string, Seat>).set(s.id, s);
  OBSTACLES.push({ kind: 'circle', x: GAME_TABLE.x, z: GAME_TABLE.z, r: GAME_TABLE.r });
}

export type SpotId = 'cards' | 'floor' | 'tv' | 'board' | 'jukebox';

export interface Game {
  id: string;
  name: string;
  emoji: string;
  min: number;
  max: number;
}

export interface Spot {
  id: SpotId;
  name: string;
  emoji: string;
  /** Rounds: newcomers join next round. Drop-in: step in any time. */
  kind: 'rounds' | 'drop-in';
  /** Sends an invite to everyone when called, and is off when the room turns room-wide games off. */
  roomWide: boolean;
  games: Game[];
  /** Being here is being in: seats for seated spots, otherwise inside the ring. */
  area: { x: number; z: number; r: number };
  seats?: string[];
  /** Built in the demo's map; the rest arrive with their features. */
  built: boolean;
  feature: number;
  tint: string;
}

export const SPOTS: Spot[] = [
  {
    id: 'cards',
    name: 'Game table',
    emoji: '🃏',
    kind: 'rounds',
    roomWide: false,
    games: [
      { id: 'slave', name: 'Slave', emoji: '🃏', min: 3, max: 4 },
      { id: 'uno', name: 'Color Cards', emoji: '🎴', min: 2, max: 4 },
    ],
    area: { x: GAME_TABLE.x, z: GAME_TABLE.z, r: 1.6 },
    seats: GAME_SEATS.map((s) => s.id),
    built: true,
    feature: 12,
    tint: 'bg-mint',
  },
  {
    id: 'floor',
    name: 'Open floor',
    emoji: '🗳️',
    kind: 'rounds',
    roomWide: true,
    games: [
      { id: 'pick', name: 'Pick a Side', emoji: '🗳️', min: 2, max: 50 },
      { id: 'quiz', name: 'AI quiz', emoji: '🧠', min: 2, max: 50 },
    ],
    area: { x: -2.6, z: 5.0, r: 1.5 },
    built: true,
    feature: 11,
    tint: 'bg-secondary',
  },
  {
    id: 'tv',
    name: 'Big screen',
    emoji: '📺',
    kind: 'drop-in',
    roomWide: false,
    games: [{ id: 'watch', name: 'Watch together', emoji: '📺', min: 1, max: 100 }],
    area: { x: 0, z: -5, r: 2 },
    built: false,
    feature: 10,
    tint: 'bg-sky',
  },
  {
    id: 'jukebox',
    name: 'Jukebox',
    emoji: '📻',
    kind: 'drop-in',
    roomWide: false,
    games: [{ id: 'jukebox', name: 'Jukebox', emoji: '📻', min: 1, max: 100 }],
    area: { x: -8, z: 4, r: 2 },
    built: false,
    feature: 10,
    tint: 'bg-peach',
  },
  {
    id: 'board',
    name: 'Whiteboard',
    emoji: '🎨',
    kind: 'drop-in',
    roomWide: false,
    games: [{ id: 'board', name: 'Whiteboard', emoji: '🎨', min: 1, max: 12 }],
    area: { x: -9, z: 0, r: 1.5 },
    built: false,
    feature: 11,
    tint: 'bg-lavender',
  },
];

export const spotById = (id: SpotId) => SPOTS.find((s) => s.id === id)!;
