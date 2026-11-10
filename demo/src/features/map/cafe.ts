import { createNavigator, resolveCollisions as resolveIn, type Obstacle, type Seat, type Walker, type World } from '@study/shared';
import { cardSeats, circle, rect, wolfSeats, zoneAtIn, type CardTable, type MapData, type Werewolf, type Zone } from './types';

/**
 * The Cat Café map (feature 7, built 2026-11-10): the same 26 × 18 m footprint and standard kit as
 * the library, with its own layout (every map has one). You come in through a door in the glass
 * front on the left. The bar runs along the back wall with the Buddy Machine by the till, the
 * open floor is the dance floor in front of it, the TV lounge sits in the back-left corner by the
 * window, the window bar faces the street, two booths (the private zones) are stacked along the
 * right side, the art corner is in the back-right corner under a cat photo wall, the tables fill
 * the front half, the Werewolf circle is front left and the card tables front right.
 * Rugs are the areas, as in the library. Units are metres; +z faces the camera.
 *
 * Not final art: odd props, overlapping rugs and the café needing more resident cats are listed in
 * the polish backlog in docs/v2/features/07-maps.md.
 */

export const ROOM = { width: 26, depth: 18 } as const;
const HW = ROOM.width / 2;
const HD = ROOM.depth / 2;
export const BOUNDS = { minX: -HW + 0.4, maxX: HW - 0.4, minZ: -HD + 0.4, maxZ: HD - 0.4 } as const;
/** The doormat inside the door with a bell, in the glass front on the left. */
export const SPAWN = { x: -11.3, z: 2.3 } as const;

const STAND_BACK = 0.5;

// ---------- A. The bar ----------

/** Counter along the back wall, left of centre; the back bar (cups, syrups, the chalk menu) is behind it. */
export const BAR = { minX: -7.5, maxX: 3.5, minZ: -8.3, maxZ: -6.6, top: 0.95 } as const;
export const BACK_BAR = { minX: -7.7, maxX: 3.7, minZ: -HD, maxZ: -8.3 } as const;
export const PASTRY_CASE = { x: -6.4, z: -7.45, w: 1.6, d: 0.9 } as const;
export const COFFEE_MACHINE = { x: 1.0, z: -7.6 } as const;
export const TILL = { x: 2.6, z: -7.4 } as const;
/** Tiles behind the bar: the floor strip the counter stands on. */
export const TILE_STRIP = { minZ: -HD, maxZ: -5.6 } as const;
const BAR_SEATS: Seat[] = Array.from({ length: 7 }, (_, i) => {
  const x = -6.75 + i * 1.5;
  return { id: `bar-${i}`, kind: 'chair', tableId: 'bar', x, z: -6.25, yaw: Math.PI, out: { x, z: -6.25 + STAND_BACK } };
});

/** The window bar on the left wall, between the lounge and the door: stools facing the glass front. */
export const WINDOW_BAR = { minX: -HW + 0.25, maxX: -HW + 0.9, minZ: -3.6, maxZ: 1.4, top: 0.95 } as const;
const WINDOW_SEATS: Seat[] = [-3.0, -2.2, -1.4, -0.6, 0.2, 1.0].map((z, i) => ({
  id: `win-${i}`,
  kind: 'chair',
  tableId: 'window',
  x: WINDOW_BAR.maxX + 0.35,
  z,
  yaw: -Math.PI / 2,
  out: { x: WINDOW_BAR.maxX + 0.35 + STAND_BACK, z },
}));

// ---------- A. Tables (the front half of the room) ----------

export interface CafeTable {
  id: string;
  kind: 'long' | 'square' | 'round';
  x: number;
  z: number;
  /** Long: width along x. Square: side. Round: diameter. */
  size: number;
}
export const TABLES: CafeTable[] = [
  { id: 'c0', kind: 'long', x: 2.0, z: 2.4, size: 3.6 },
  { id: 'q0', kind: 'square', x: -4.6, z: 2.0, size: 1.2 },
  { id: 'q1', kind: 'square', x: -3.2, z: 5.4, size: 1.2 },
  { id: 'r0', kind: 'round', x: 6.6, z: 1.0, size: 0.84 },
  { id: 'r1', kind: 'round', x: 6.6, z: 3.6, size: 0.84 },
  { id: 'r2', kind: 'round', x: 1.8, z: 6.4, size: 0.84 },
  { id: 'r3', kind: 'round', x: -0.6, z: 7.4, size: 0.84 },
];
const seat = (id: string, tableId: string, x: number, z: number, yaw: number): Seat => ({
  id,
  kind: 'chair',
  tableId,
  x,
  z,
  yaw,
  out: { x: x - Math.sin(yaw) * STAND_BACK, z: z - Math.cos(yaw) * STAND_BACK },
});
function tableSeats(t: CafeTable): Seat[] {
  if (t.kind === 'long') {
    const n = Math.round(t.size / 1.2);
    const seats: Seat[] = [];
    for (let i = 0; i < n; i++) {
      const x = t.x - t.size / 2 + 0.6 + i * 1.2;
      seats.push(seat(`${t.id}-b${i}`, t.id, x, t.z - 0.95, 0), seat(`${t.id}-f${i}`, t.id, x, t.z + 0.95, Math.PI));
    }
    const ex = t.size / 2 + 0.55;
    seats.push(seat(`${t.id}-e0`, t.id, t.x - ex, t.z, Math.PI / 2), seat(`${t.id}-e1`, t.id, t.x + ex, t.z, -Math.PI / 2));
    return seats;
  }
  if (t.kind === 'square') {
    const d = t.size / 2 + 0.35;
    return [
      seat(`${t.id}-n`, t.id, t.x, t.z - d, 0),
      seat(`${t.id}-s`, t.id, t.x, t.z + d, Math.PI),
      seat(`${t.id}-w`, t.id, t.x - d, t.z, Math.PI / 2),
      seat(`${t.id}-e`, t.id, t.x + d, t.z, -Math.PI / 2),
    ];
  }
  const d = t.size / 2 + 0.43;
  return [seat(`${t.id}-w`, t.id, t.x - d, t.z, Math.PI / 2), seat(`${t.id}-e`, t.id, t.x + d, t.z, -Math.PI / 2)];
}
export const TABLE_SEATS: Seat[] = TABLES.flatMap(tableSeats);
export const DESK_SEATS: Seat[] = [...BAR_SEATS, ...WINDOW_SEATS, ...TABLE_SEATS];
export const TABLES_RUG = rect(1.4, 4.0, 13.2, 8.6);

// ---------- B. Booths (private zones), stacked along the right side ----------

export interface Booth {
  id: string;
  zone: Zone;
  /** Two facing benches (along x) with a table between. */
  benches: { minZ: number; maxZ: number; yaw: number }[];
  table: { x: number; z: number; w: number; d: number };
  x0: number;
  x1: number;
}
const booth = (id: string, name: string, emoji: string, cz: number): Booth => ({
  id,
  zone: { id, name, emoji, area: rect(10.6, cz, 4.2, 3.0) },
  benches: [
    { minZ: cz - 1.4, maxZ: cz - 0.8, yaw: 0 },
    { minZ: cz + 0.8, maxZ: cz + 1.4, yaw: Math.PI },
  ],
  table: { x: 10.6, z: cz, w: 1.8, d: 0.7 },
  x0: 8.8,
  x1: 12.4,
});
export const BOOTHS: Booth[] = [booth('booth', 'Window booth', '🪟', -1.6), booth('corner', 'Corner booth', '🐾', 2.0)];
const BOOTH_SEATS: Seat[] = BOOTHS.flatMap((b) =>
  b.benches.flatMap((bench, bi) =>
    [9.7, 11.5].map((x, i) => ({
      id: `${b.id}-${bi * 2 + i}`,
      kind: 'sofa' as const,
      tableId: b.id,
      x,
      z: (bench.minZ + bench.maxZ) / 2,
      yaw: bench.yaw,
      // Step out sideways, into the aisle beside the booth
      out: { x: x < 10.6 ? b.x0 - 0.3 : b.x1 + 0.3, z: (bench.minZ + bench.maxZ) / 2 },
    })),
  ),
);

// ---------- C. Menu board (the whiteboard), on the back wall between the bar and the art corner ----------

export const BOARD = { x: 6.3, z: -HD + 0.12, width: 1.9, height: 1.07, y: 1.45, yaw: 0 } as const;
export const BOARD_AREA = rect(6.3, -7.1, 2.8, 3.0);

// ---------- E. TV lounge, in the back-left corner by the window ----------

export const LOUNGE = {
  area: rect(-10.4, -6.4, 4.6, 4.4),
  /** A low shelf under the TV, along the back wall. */
  shelf: { minX: -11.6, maxX: -9.2, minZ: -HD + 0.2, maxZ: -HD + 0.6 },
  beanbags: [
    { x: -11.6, z: -5.3, r: 0.42 },
    { x: -10.2, z: -5.0, r: 0.42 },
    { x: -8.9, z: -6.0, r: 0.42 },
    { x: -11.2, z: -6.9, r: 0.42 },
  ],
  cushions: [
    { x: -9.9, z: -6.5, r: 0.26 },
    { x: -10.6, z: -7.6, r: 0.26 },
  ],
  catTower: { x: -8.5, z: -7.9 },
  lamp: { x: -12.3, z: -4.5 },
} as const;
/** On the back wall, over the low shelf, facing into the room (+z). */
export const TV = { x: -10.4, z: -HD + 0.08, y: 1.6, width: 2.2, height: 1.24, yaw: 0 } as const;
const LOUNGE_SEATS: Seat[] = [...LOUNGE.beanbags, ...LOUNGE.cushions].map((b, i) => ({
  id: `lounge-${i}`,
  kind: 'sofa',
  tableId: 'lounge',
  x: b.x,
  z: b.z,
  yaw: 0,
  out: { x: b.x, z: b.z + b.r + 0.4 },
}));

// ---------- F. Open floor: the dance floor in front of the bar ----------

export const FLOOR_AREA = rect(-2.0, -3.0, 6.0, 5.2);

// ---------- Entrance: a door in the glass front, on the left wall ----------

export const DOOR = { z: 2.3, width: 1.4 } as const;
export const DOORMAT = rect(-12.0, DOOR.z, 1.2, 1.8);
export const UMBRELLA_STAND = { x: -12.3, z: 3.6 } as const;
export const A_BOARD = { x: -11.2, z: 4.4 } as const;
/** By the till, at the bar's end, facing into the room (+z). */
export const GACHA_MACHINE = { x: 4.3, z: -7.5, yaw: 0, reach: 1.7 } as const;

// ---------- G. Card tables (front right), H. Werewolf (front left), I. Art corner (back right) ----------

export const CARD_TABLES: CardTable[] = [
  { id: 'game1', x: 10.2, z: 6.5, r: 0.62, area: rect(10.2, 6.5, 3.0, 3.0) },
  { id: 'game2', x: 6.6, z: 6.8, r: 0.62, area: rect(6.6, 6.8, 3.0, 3.0) },
];
const CARD_SEATS: Seat[] = CARD_TABLES.flatMap(cardSeats);

export const WOLF: Werewolf = { x: -8.8, z: 6.1, tableR: 0.6, cushionR: 1.55, area: circle(-8.8, 6.1, 2.6) };
export const WOLF_SEATS: Seat[] = wolfSeats(WOLF);

export const ART_AREA = rect(10.4, -6.4, 4.6, 4.2);
export const EASELS = [
  { x: 9.0, z: -7.7 },
  { x: 12.0, z: -7.5 },
  { x: 12.1, z: -5.0 },
  { x: 8.7, z: -5.3 },
].map((e) => ({ ...e, yaw: Math.atan2(ART_AREA.x - e.x, ART_AREA.z - e.z) }));
export const PAINT_CART = { x: 10.6, z: -4.6 } as const;
/** The cat photo wall: framed pictures on the back wall above the art corner. */
export const PHOTO_WALL = { x: 10.4, y: 2.3, width: 3.6 } as const;

// ---------- Cats and decor ----------

export const CAT_BEDS = [
  { x: -6.4, z: -1.0 },
  { x: -7.6, z: 1.6 },
  { x: 12.4, z: 4.5 },
  { x: 4.6, z: -5.4 },
];
export const CAT_WHEEL = { x: 3.4, z: -0.2 } as const;
export const PLANTS = [
  { x: 12.5, z: 8.6, s: 1 },
  { x: -12.5, z: 8.6, s: 0.9 },
  { x: 3.5, z: 8.6, s: 0.8 },
  { x: 12.6, z: -3.7, s: 0.9 },
  { x: -6.3, z: -6.0, s: 0.9 },
];
/** Big windows on the left wall (z ranges): the glass front, with the door between them. */
export const FRONT_WINDOWS = [
  { z0: -8.4, z1: 1.3 },
  { z0: 3.3, z1: 8.5 },
];

export const ZONES: Zone[] = BOOTHS.map((b) => b.zone);

// ---------- Seats, collisions, cats ----------

export const SEATS: Seat[] = [...DESK_SEATS, ...BOOTH_SEATS, ...LOUNGE_SEATS, ...CARD_SEATS, ...WOLF_SEATS];
export const SEAT_BY_ID: ReadonlyMap<string, Seat> = new Map(SEATS.map((s) => [s.id, s]));

const box = (minX: number, maxX: number, minZ: number, maxZ: number): Obstacle => ({ kind: 'box', minX, maxX, minZ, maxZ });
const disc = (x: number, z: number, r: number): Obstacle => ({ kind: 'circle', x, z, r });

export const OBSTACLES: Obstacle[] = [
  box(BAR.minX, BAR.maxX, BAR.minZ, BAR.maxZ),
  box(BACK_BAR.minX, BACK_BAR.maxX, BACK_BAR.minZ, BACK_BAR.maxZ),
  box(WINDOW_BAR.minX, WINDOW_BAR.maxX, WINDOW_BAR.minZ, WINDOW_BAR.maxZ),
  ...TABLES.map((t) =>
    t.kind === 'round'
      ? disc(t.x, t.z, t.size / 2)
      : t.kind === 'long'
        ? box(t.x - t.size / 2, t.x + t.size / 2, t.z - 0.6, t.z + 0.6)
        : box(t.x - t.size / 2, t.x + t.size / 2, t.z - t.size / 2, t.z + t.size / 2),
  ),
  ...BOOTHS.flatMap((b) => [
    ...b.benches.map((bench) => box(b.x0, b.x1, bench.minZ, bench.maxZ)),
    box(b.table.x - b.table.w / 2, b.table.x + b.table.w / 2, b.table.z - b.table.d / 2, b.table.z + b.table.d / 2),
  ]),
  box(LOUNGE.shelf.minX, LOUNGE.shelf.maxX, LOUNGE.shelf.minZ, LOUNGE.shelf.maxZ),
  ...LOUNGE.beanbags.map((b) => disc(b.x, b.z, b.r)),
  ...LOUNGE.cushions.map((b) => disc(b.x, b.z, b.r)),
  box(LOUNGE.catTower.x - 0.35, LOUNGE.catTower.x + 0.35, LOUNGE.catTower.z - 0.35, LOUNGE.catTower.z + 0.35),
  disc(LOUNGE.lamp.x, LOUNGE.lamp.z, 0.25),
  disc(UMBRELLA_STAND.x, UMBRELLA_STAND.z, 0.25),
  disc(A_BOARD.x, A_BOARD.z, 0.35),
  disc(GACHA_MACHINE.x, GACHA_MACHINE.z, 0.5),
  ...CARD_TABLES.map((t) => disc(t.x, t.z, t.r)),
  disc(WOLF.x, WOLF.z, WOLF.tableR),
  ...EASELS.map((e) => disc(e.x, e.z, 0.3)),
  disc(PAINT_CART.x, PAINT_CART.z, 0.3),
  ...CAT_BEDS.map((c) => disc(c.x, c.z, 0.32)),
  disc(CAT_WHEEL.x, CAT_WHEEL.z, 0.3),
  ...PLANTS.map((p) => disc(p.x, p.z, 0.35)),
];

export const WORLD: World = { bounds: BOUNDS, obstacles: OBSTACLES };
const nav = createNavigator(WORLD);
export const resolveCollisions = (p: { x: number; z: number }, others: Iterable<Walker>, radius?: number) =>
  resolveIn(p, others, radius, WORLD);

export const STARTER_CAT = { x: -9.6, z: 0.2 } as const;
export const NPC_SPAWN = {
  x: GACHA_MACHINE.x + Math.sin(GACHA_MACHINE.yaw) * 1.0,
  z: GACHA_MACHINE.z + Math.cos(GACHA_MACHINE.yaw) * 1.0,
} as const;
export const NAP_SPOTS: { x: number; z: number; y: number }[] = [
  { x: -12.5, z: -1.0, y: WINDOW_BAR.top }, // on the window bar, in the sun
  { x: LOUNGE.catTower.x - 0.15, z: LOUNGE.catTower.z - 0.15, y: 1.45 }, // top of the cat tower
  { x: CAT_BEDS[3]!.x, z: CAT_BEDS[3]!.z, y: 0.08 }, // the bed by the bar
  { x: 12.1, z: -2.7, y: 0.45 }, // end of the window booth's bench
  { x: WOLF.x, z: WOLF.z + WOLF.cushionR, y: 0.12 }, // a Werewolf cushion
];

export const CAFE: MapData = {
  id: 'cafe',
  name: 'Cat Café',
  room: ROOM,
  bounds: BOUNDS,
  spawn: SPAWN,
  seats: SEATS,
  seatById: SEAT_BY_ID,
  deskSeats: DESK_SEATS,
  obstacles: OBSTACLES,
  zones: ZONES,
  cardTables: CARD_TABLES,
  wolf: WOLF,
  floorArea: FLOOR_AREA,
  tvArea: LOUNGE.area,
  boardArea: BOARD_AREA,
  artArea: ART_AREA,
  tv: TV,
  board: BOARD,
  gacha: GACHA_MACHINE,
  starterCat: STARTER_CAT,
  npcSpawn: NPC_SPAWN,
  napSpots: NAP_SPOTS,
  nav,
  resolveCollisions,
};
export const zoneAt = (x: number, z: number) => zoneAtIn(CAFE, x, z);
