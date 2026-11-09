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

/** The whiteboard on the left wall, between the corner plant and the Buddy Machine. */
export const BOARD = { x: -9.88, z: -4.4, width: 1.9, height: 1.07, y: 1.45 } as const;

/** The big screen on the left wall, between the Buddy Machine and the reading nook, facing into the room. */
export const TV = { x: -9.88, z: -0.1, width: 2.6, height: 1.46, y: 1.55 } as const;

// Register the table with the shared seats and collisions once (module state survives hot reloads)
if (!SEAT_BY_ID.has('game-0')) {
  SEATS.push(...GAME_SEATS);
  for (const s of GAME_SEATS) (SEAT_BY_ID as Map<string, Seat>).set(s.id, s);
  OBSTACLES.push({ kind: 'circle', x: GAME_TABLE.x, z: GAME_TABLE.z, r: GAME_TABLE.r });
}

export type SpotId = 'cards' | 'floor' | 'tv' | 'board';

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
      { id: 'wyr', name: 'Would you rather', emoji: '🤔', min: 2, max: 50 },
      { id: 'quiz', name: 'Quiz', emoji: '🧠', min: 2, max: 50 },
      { id: 'last', name: 'Last one standing', emoji: '💀', min: 2, max: 50 },
    ],
    // Big enough for four zones with a few people in each
    area: { x: -2.5, z: 4.85, r: 1.75 },
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
    area: { x: TV.x + 1.9, z: TV.z, r: 1.7 },
    built: true,
    feature: 10,
    tint: 'bg-sky',
  },
  {
    id: 'board',
    name: 'Whiteboard',
    emoji: '🎨',
    kind: 'drop-in',
    roomWide: false,
    games: [{ id: 'board', name: 'Whiteboard', emoji: '🎨', min: 1, max: 12 }],
    area: { x: BOARD.x + 1.6, z: BOARD.z, r: 1.35 },
    built: true,
    feature: 11,
    tint: 'bg-lavender',
  },
];

export const spotById = (id: SpotId) => SPOTS.find((s) => s.id === id)!;
