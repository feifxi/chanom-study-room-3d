import { createNavigator, resolveCollisions as resolveIn, type Obstacle, type Seat, type Walker, type World } from '@study/shared';
import { cardSeats, circle, rect, wolfSeats, zoneAtIn, type CardTable, type MapData, type Werewolf, type Zone } from './types';

/**
 * The Starry Rooftop map (feature 7, built 2026-11-10): a 26 × 18 m terrace with its own layout.
 * The only solid thing is the stairwell block in the back-left corner: you come out of its door,
 * the Buddy Machine and the chalk wall are beside it, and the outdoor cinema sheet hangs on its
 * front. Everything else is open to the sky behind a parapet and railings, with the city beyond.
 * Picnic desks under string lights on the left, the campfire circle in the middle, the open deck in
 * front, the tent (private) in the back-right corner, the Werewolf circle on the right, the telescope
 * deck (private) front right, the art corner front left, card tables by the chalk wall.
 * Rugs (decking, gravel, mats) are the areas. Units are metres; +z faces the camera.
 *
 * Not final art: odd props, overlapping rugs and other fixes are listed in the polish backlog in
 * docs/v2/features/07-maps.md.
 */

export const ROOM = { width: 26, depth: 18 } as const;
const HW = ROOM.width / 2;
const HD = ROOM.depth / 2;
export const BOUNDS = { minX: -HW + 0.5, maxX: HW - 0.5, minZ: -HD + 0.5, maxZ: HD - 0.5 } as const;

const STAND_BACK = 0.5;

// ---------- The stairwell block (the only wall) ----------

export const STAIRWELL = { minX: -HW, maxX: -8.0, minZ: -HD, maxZ: -5.0, height: 3.2 } as const;
/** The door in the block's right side; you come out facing the terrace. */
export const STAIR_DOOR = { x: STAIRWELL.maxX, z: -8.0, width: 1.0 } as const;
export const SPAWN = { x: -7.0, z: -8.0 } as const;
/** By the stairs, facing down the terrace (+z). */
export const GACHA_MACHINE = { x: -5.8, z: -8.4, yaw: 0, reach: 1.7 } as const;
/** The parapet: a low wall with a rail along every open edge. */
export const PARAPET = { height: 1.0, thickness: 0.3 } as const;

// ---------- Big screen: the outdoor cinema sheet on the block's front ----------

export const TV = { x: -10.5, z: STAIRWELL.maxZ + 0.08, y: 2.0, width: 3.6, height: 2.0, yaw: 0 } as const;
export const CINEMA = {
  area: rect(-10.5, -3.0, 4.2, 3.6),
  cushions: [
    { x: -11.9, z: -4.0, r: 0.3 },
    { x: -11.0, z: -3.4, r: 0.3 },
    { x: -10.0, z: -4.0, r: 0.3 },
    { x: -9.1, z: -3.3, r: 0.3 },
    { x: -11.4, z: -2.2, r: 0.3 },
    { x: -9.7, z: -2.0, r: 0.3 },
  ],
} as const;
const CINEMA_SEATS: Seat[] = CINEMA.cushions.map((c, i) => ({
  id: `cinema-${i}`,
  kind: 'sofa',
  tableId: 'cinema',
  x: c.x,
  z: c.z,
  yaw: 0,
  out: { x: c.x, z: c.z + 0.7 },
}));

// ---------- Chalk wall by the stairs (the whiteboard) ----------

export const BOARD = { x: STAIRWELL.maxX + 0.12, z: -5.9, width: 1.9, height: 1.07, y: 1.45, yaw: Math.PI / 2 } as const;
export const BOARD_AREA = rect(-6.4, -5.9, 3.2, 3.2);

// ---------- Picnic desks (study) ----------

export interface PicnicTable {
  id: string;
  x: number;
  z: number;
}
export const PICNIC_TABLES: PicnicTable[] = [
  { id: 'p0', x: -10.0, z: 0.6 },
  { id: 'p1', x: -6.0, z: 0.6 },
  { id: 'p2', x: -10.0, z: 3.4 },
  { id: 'p3', x: -6.0, z: 3.4 },
];
export const PICNIC = { w: 2.0, d: 0.8, benchZ: 0.7 } as const;
export const PICNIC_RUG = rect(-8.0, 2.0, 8.4, 4.4);
const picnicSeats = (t: PicnicTable): Seat[] =>
  [-0.65, 0, 0.65].flatMap((dx, i) => [
    {
      id: `${t.id}-b${i}`,
      kind: 'chair' as const,
      tableId: t.id,
      x: t.x + dx,
      z: t.z - PICNIC.benchZ,
      yaw: 0,
      out: { x: t.x + dx, z: t.z - PICNIC.benchZ - STAND_BACK },
    },
    {
      id: `${t.id}-f${i}`,
      kind: 'chair' as const,
      tableId: t.id,
      x: t.x + dx,
      z: t.z + PICNIC.benchZ,
      yaw: Math.PI,
      out: { x: t.x + dx, z: t.z + PICNIC.benchZ + STAND_BACK },
    },
  ]);
export const DESK_SEATS: Seat[] = PICNIC_TABLES.flatMap(picnicSeats);

// ---------- Campfire circle (the lounge) ----------

export const CAMPFIRE = { x: 0.5, z: -1.6, pitR: 0.55, logR: 1.7, area: circle(0.5, -1.6, 2.8) } as const;
const FIRE_SEATS: Seat[] = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
  const dx = Math.sin(a);
  const dz = Math.cos(a);
  return {
    id: `fire-${i}`,
    kind: 'sofa',
    tableId: 'fire',
    x: CAMPFIRE.x + dx * CAMPFIRE.logR,
    z: CAMPFIRE.z + dz * CAMPFIRE.logR,
    yaw: a + Math.PI,
    out: { x: CAMPFIRE.x + dx * (CAMPFIRE.logR + 0.7), z: CAMPFIRE.z + dz * (CAMPFIRE.logR + 0.7) },
  };
});

// ---------- Open deck (the open floor) ----------

export const FLOOR_AREA = rect(1.0, 4.6, 6.0, 5.4);

// ---------- Private zones: the tent and the telescope deck ----------

export const TENT = { x: 10.5, z: -6.5, r: 2.0, height: 2.8, zone: rect(10.5, -6.5, 4.2, 4.2) } as const;
const TENT_SEATS: Seat[] = [0, 1, 2, 3].map((i) => {
  // Four cushions in a ring inside, facing the middle
  const a = Math.PI / 4 + (i * Math.PI) / 2;
  const dx = Math.sin(a);
  const dz = Math.cos(a);
  return {
    id: `tent-${i}`,
    kind: 'sofa',
    tableId: 'tent',
    x: TENT.x + dx * 0.9,
    z: TENT.z + dz * 0.9,
    yaw: a + Math.PI,
    out: { x: TENT.x + dx * 1.6, z: TENT.z + dz * 1.6 },
  };
});

export const DECK = {
  zone: rect(10.5, 6.2, 4.4, 4.4),
  telescope: { x: 11.7, z: 7.4, yaw: -Math.PI / 4 },
  chairs: [
    { x: 9.4, z: 5.2, yaw: -Math.PI / 2 },
    { x: 9.4, z: 6.6, yaw: -Math.PI / 2 },
  ],
  bench: { x: 11.2, z: 4.6, w: 1.6 },
  lamp: { x: 12.3, z: 4.5 },
} as const;
const DECK_SEATS: Seat[] = [
  ...DECK.chairs.map((c, i) => ({
    id: `deck-${i}`,
    kind: 'sofa' as const,
    tableId: 'deck',
    x: c.x,
    z: c.z,
    yaw: c.yaw,
    out: { x: c.x + 0.75, z: c.z },
  })),
  ...[-0.4, 0.4].map((dx, i) => ({
    id: `deck-${i + 2}`,
    kind: 'sofa' as const,
    tableId: 'deck',
    x: DECK.bench.x + dx,
    z: DECK.bench.z,
    yaw: 0,
    out: { x: DECK.bench.x + dx, z: DECK.bench.z + 0.75 },
  })),
];

// ---------- Card tables, Werewolf circle, art corner ----------

export const CARD_TABLES: CardTable[] = [
  { id: 'game1', x: 5.2, z: -5.8, r: 0.62, area: rect(5.2, -5.8, 3.0, 3.0) },
  { id: 'game2', x: 5.2, z: -2.4, r: 0.62, area: rect(5.2, -2.4, 3.0, 3.0) },
];
const CARD_SEATS: Seat[] = CARD_TABLES.flatMap(cardSeats);

export const WOLF: Werewolf = { x: 9.6, z: 0.6, tableR: 0.6, cushionR: 1.55, area: circle(9.6, 0.6, 2.6) };
export const WOLF_SEATS: Seat[] = wolfSeats(WOLF);

export const ART_AREA = rect(-10.5, 6.8, 4.2, 3.6);
export const EASELS = [
  { x: -12.2, z: 6.0 },
  { x: -12.2, z: 8.0 },
  { x: -9.0, z: 8.2 },
  { x: -8.9, z: 5.8 },
].map((e) => ({ ...e, yaw: Math.atan2(ART_AREA.x - e.x, ART_AREA.z - e.z) }));
export const PAINT_CART = { x: -10.6, z: 8.3 } as const;
/** A folding screen along the back of the art rug, facing the room. */
export const GALLERY = { x: -10.5, z: 5.1, width: 2.6, height: 1.9, y: 1.3, yaw: 0 } as const;

// ---------- Decor ----------

export const HAMMOCK = { x: 6.4, z: 8.0, length: 2.6 } as const;
export const PLANTERS = [
  { x: -3.0, z: -8.5 },
  { x: 0.5, z: -8.5 },
  { x: 12.5, z: -3.4 },
  { x: 12.5, z: 2.9 },
  { x: -12.5, z: -0.4 },
  { x: 3.8, z: 8.5 },
];
export const LANTERNS = [
  { x: -3.6, z: -0.2 },
  { x: 7.2, z: 3.6 },
  { x: -3.8, z: 5.4 },
];
/** String-light posts: lights zigzag between them over the picnic desks and the campfire. */
export const POSTS = [
  { x: -12.4, z: -0.6 },
  { x: -3.6, z: -0.6 },
  { x: -12.4, z: 4.6 },
  { x: -3.6, z: 4.6 },
  { x: -2.6, z: -5.0 },
  { x: 3.6, z: 1.6 },
];

export const ZONES: Zone[] = [
  { id: 'tent', name: 'Tent', emoji: '⛺', area: TENT.zone },
  { id: 'deck', name: 'Telescope deck', emoji: '🔭', area: DECK.zone },
];

// ---------- Seats, collisions, cats ----------

export const SEATS: Seat[] = [...DESK_SEATS, ...CINEMA_SEATS, ...FIRE_SEATS, ...TENT_SEATS, ...DECK_SEATS, ...CARD_SEATS, ...WOLF_SEATS];
export const SEAT_BY_ID: ReadonlyMap<string, Seat> = new Map(SEATS.map((s) => [s.id, s]));

const box = (minX: number, maxX: number, minZ: number, maxZ: number): Obstacle => ({ kind: 'box', minX, maxX, minZ, maxZ });
const disc = (x: number, z: number, r: number): Obstacle => ({ kind: 'circle', x, z, r });

export const OBSTACLES: Obstacle[] = [
  box(STAIRWELL.minX, STAIRWELL.maxX, STAIRWELL.minZ, STAIRWELL.maxZ),
  disc(GACHA_MACHINE.x, GACHA_MACHINE.z, 0.5),
  ...CINEMA.cushions.map((c) => disc(c.x, c.z, c.r)),
  ...PICNIC_TABLES.map((t) => box(t.x - PICNIC.w / 2, t.x + PICNIC.w / 2, t.z - PICNIC.d / 2, t.z + PICNIC.d / 2)),
  disc(CAMPFIRE.x, CAMPFIRE.z, CAMPFIRE.pitR + 0.25),
  disc(TENT.x, TENT.z, 0.15),
  box(DECK.bench.x - DECK.bench.w / 2, DECK.bench.x + DECK.bench.w / 2, DECK.bench.z - 0.25, DECK.bench.z + 0.25),
  disc(DECK.telescope.x, DECK.telescope.z, 0.4),
  disc(DECK.lamp.x, DECK.lamp.z, 0.25),
  ...CARD_TABLES.map((t) => disc(t.x, t.z, t.r)),
  disc(WOLF.x, WOLF.z, WOLF.tableR),
  ...EASELS.map((e) => disc(e.x, e.z, 0.3)),
  disc(PAINT_CART.x, PAINT_CART.z, 0.3),
  box(GALLERY.x - GALLERY.width / 2, GALLERY.x + GALLERY.width / 2, GALLERY.z - 0.2, GALLERY.z + 0.15),
  disc(HAMMOCK.x - HAMMOCK.length / 2, HAMMOCK.z, 0.2),
  disc(HAMMOCK.x + HAMMOCK.length / 2, HAMMOCK.z, 0.2),
  ...PLANTERS.map((p) => disc(p.x, p.z, 0.4)),
  ...LANTERNS.map((l) => disc(l.x, l.z, 0.2)),
  ...POSTS.map((p) => disc(p.x, p.z, 0.12)),
];

export const WORLD: World = { bounds: BOUNDS, obstacles: OBSTACLES };
const nav = createNavigator(WORLD);
export const resolveCollisions = (p: { x: number; z: number }, others: Iterable<Walker>, radius?: number) =>
  resolveIn(p, others, radius, WORLD);

export const STARTER_CAT = { x: -4.0, z: -3.0 } as const;
export const NPC_SPAWN = {
  x: GACHA_MACHINE.x + Math.sin(GACHA_MACHINE.yaw) * 1.0,
  z: GACHA_MACHINE.z + Math.cos(GACHA_MACHINE.yaw) * 1.0,
} as const;
export const NAP_SPOTS: { x: number; z: number; y: number }[] = [
  { x: HAMMOCK.x, z: HAMMOCK.z, y: 0.62 }, // the hammock
  { x: 12.7, z: -0.8, y: PARAPET.height }, // on the parapet
  { x: TENT.x, z: TENT.z - 1.4, y: 0.08 }, // just inside the tent
  { x: CAMPFIRE.x + 2.3, z: CAMPFIRE.z + 0.4, y: 0 }, // warm, by the fire
  { x: WOLF.x, z: WOLF.z + WOLF.cushionR, y: 0.12 }, // a Werewolf cushion
];

export const ROOFTOP: MapData = {
  id: 'rooftop',
  name: 'Starry Rooftop',
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
  tvArea: CINEMA.area,
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
export const zoneAt = (x: number, z: number) => zoneAtIn(ROOFTOP, x, z);
