import {
  createNavigator,
  resolveCollisions as resolveIn,
  type Obstacle,
  type Seat,
  type Table,
  type Walker,
  type World,
} from '@study/shared';
import { cardSeats, circle, rect, wolfSeats, zoneAtIn, type CardTable, type MapData, type Zone } from './types';

/**
 * The Cosy Library map (feature 7, redesigned 2026-11-10): a 26 × 18 m reading room laid out in
 * bands. Quiet at the back (study tables under the shelves, the window booth), the fireplace and the
 * TV lounge down the left wall, the open floor and the door in front, games and the art corner on the
 * right. Every activity and private zone is a rug: the rug *is* the area, so nothing floats.
 *
 * Units are metres; +z faces the camera (front), the camera looks in from +x +z. This replaces V1's
 * hard-coded layout in `@study/shared` for the demo; once maps are data it becomes the map file.
 *
 * Not final art: odd props, overlapping rugs and other fixes are listed in the polish backlog in
 * docs/v2/features/07-maps.md.
 */

export const ROOM = { width: 26, depth: 18 } as const;
const HW = ROOM.width / 2;
const HD = ROOM.depth / 2;

export const BOUNDS = { minX: -HW + 0.4, maxX: HW - 0.4, minZ: -HD + 0.4, maxZ: HD - 0.4 } as const;

/** The doormat, just inside the front door. */
export const SPAWN = { x: 0, z: 7.9 } as const;

// ---------- A. Study block ----------

const SMALL_W = 2.4;
const TABLE_D = 1.2;
const STAND_BACK = 0.5;

export interface StudyTable extends Table {
  /** Long tables seat people at both ends too. */
  ends: boolean;
  /** Banker's lamps along the middle. */
  lamps: number;
}

/** Four small tables on the left, two long tables under the big window on the right. */
export const STUDY_TABLES: StudyTable[] = [
  ...[-7.5, -3.5].flatMap((x, col) =>
    [-6.0, -2.4].map((z, row) => ({ id: `t${row}${col}`, x, z, width: SMALL_W, depth: TABLE_D, ends: false, lamps: 1 })),
  ),
  { id: 'l0', x: 3.4, z: -6.0, width: 4.8, depth: TABLE_D, ends: true, lamps: 2 },
  { id: 'l1', x: 2.8, z: -2.4, width: 3.6, depth: TABLE_D, ends: true, lamps: 1 },
];

function tableSeats(t: StudyTable): Seat[] {
  const n = Math.round(t.width / 1.2);
  const seats: Seat[] = [];
  for (let i = 0; i < n; i++) {
    const x = t.x - t.width / 2 + 0.6 + i * 1.2;
    // Back side faces +z (toward the table), front side faces -z
    seats.push({ id: `${t.id}-b${i}`, kind: 'chair', tableId: t.id, x, z: t.z - 0.95, yaw: 0, out: { x, z: t.z - 0.95 - STAND_BACK } });
    seats.push({
      id: `${t.id}-f${i}`,
      kind: 'chair',
      tableId: t.id,
      x,
      z: t.z + 0.95,
      yaw: Math.PI,
      out: { x, z: t.z + 0.95 + STAND_BACK },
    });
  }
  if (t.ends) {
    const ex = t.width / 2 + 0.55;
    seats.push({
      id: `${t.id}-e0`,
      kind: 'chair',
      tableId: t.id,
      x: t.x - ex,
      z: t.z,
      yaw: Math.PI / 2,
      out: { x: t.x - ex - STAND_BACK, z: t.z },
    });
    seats.push({
      id: `${t.id}-e1`,
      kind: 'chair',
      tableId: t.id,
      x: t.x + ex,
      z: t.z,
      yaw: -Math.PI / 2,
      out: { x: t.x + ex + STAND_BACK, z: t.z },
    });
  }
  return seats;
}

/** Desk chairs: a laptop each, and where study buddies sit. */
export const DESK_SEATS: Seat[] = STUDY_TABLES.flatMap(tableSeats);

/** Rugs under the two halves of the study block. */
export const STUDY_RUGS = [rect(-5.5, -4.2, 6.8, 6.6), rect(3.6, -4.2, 7.6, 6.6)];

// ---------- B. Window booth (private zone) ----------

export const BOOTH = {
  zone: rect(10.5, -6.85, 4.2, 3.1),
  bench: { minX: 8.6, maxX: 12.4, minZ: -8.25, maxZ: -7.55, seatY: 0.45 },
  table: { x: 10.5, z: -6.55, w: 1.4, d: 0.7 },
  lamp: { x: 10.5, z: -7.2, y: 2.4 },
} as const;
const BOOTH_SEATS: Seat[] = [9.1, 9.9, 11.1, 11.9].map((x, i) => ({
  id: `booth-${i}`,
  kind: 'sofa',
  tableId: 'booth',
  x,
  z: -7.9,
  yaw: 0,
  out: { x, z: -7.0 },
}));

// ---------- C. Whiteboard ----------

export const BOARD = { x: -HW + 0.12, z: -6.0, width: 1.9, height: 1.07, y: 1.45, yaw: Math.PI / 2 } as const;
export const BOARD_AREA = rect(-11.2, -6.0, 3.2, 3.2);
export const CHALK_CART = { x: -10.3, z: -7.3 } as const;

// ---------- D. Fireside (private zone) ----------

export const FIRESIDE = {
  zone: rect(-10.95, 0.5, 3.5, 3.8),
  /** Stone surround on the left wall; the fire glows inside it. */
  hearth: { x: -HW + 0.35, z: 0.5, width: 2.4, depth: 0.7 },
  loveseat: { x: -9.9, z: 0.5, yaw: -Math.PI / 2 },
  armchairs: [
    { x: -11.6, z: -0.95, yaw: 0 },
    { x: -11.6, z: 1.95, yaw: Math.PI },
  ],
  sideTable: { x: -10.9, z: -0.7, r: 0.28 },
  lamp: { x: -9.7, z: 2.2 },
} as const;
const FIRESIDE_SEATS: Seat[] = [
  // Loveseat: two side by side, facing the fire (−x)
  ...[0.15, 0.85].map((z, i) => ({
    id: `fire-${i}`,
    kind: 'sofa' as const,
    tableId: 'fire',
    x: FIRESIDE.loveseat.x,
    z,
    yaw: FIRESIDE.loveseat.yaw,
    out: { x: FIRESIDE.loveseat.x + 0.75, z },
  })),
  ...FIRESIDE.armchairs.map((c, i) => ({
    id: `fire-${i + 2}`,
    kind: 'sofa' as const,
    tableId: 'fire',
    x: c.x,
    z: c.z,
    yaw: c.yaw,
    out: { x: c.x, z: c.z + Math.cos(c.yaw) * 0.75 },
  })),
];

// ---------- E. TV lounge ----------

export const LOUNGE = {
  area: rect(-10.45, 6.05, 4.6, 4.9),
  console: { minX: -HW + 0.2, maxX: -HW + 0.75, minZ: 4.9, maxZ: 7.3 },
  /** The L-shaped sofa: a long run facing the TV and a short arm along the front. */
  sofaRun: { minX: -10.15, maxX: -9.45, minZ: 3.95, maxZ: 7.45 },
  sofaArm: { minX: -11.8, maxX: -9.45, minZ: 7.45, maxZ: 8.3 },
  beanbags: [
    { x: -11.1, z: 4.3, r: 0.42 },
    { x: -11.4, z: 5.6, r: 0.42 },
  ],
  cushions: [
    { x: -11.2, z: 6.8, r: 0.26 },
    { x: -10.5, z: 5.9, r: 0.26 },
  ],
  lamp: { x: -12.3, z: 8.3 },
} as const;
/** On the console against the left wall, facing into the room (+x). */
export const TV = { x: -HW + 0.55, z: 6.1, y: 1.3, width: 2.2, height: 1.24, yaw: Math.PI / 2 } as const;
const LOUNGE_SEATS: Seat[] = [
  ...[4.5, 5.3, 6.1, 6.9].map((z, i) => ({
    id: `lounge-${i}`,
    kind: 'sofa' as const,
    tableId: 'lounge',
    x: -9.8,
    z,
    yaw: -Math.PI / 2,
    out: { x: -9.0, z },
  })),
  ...[-11.3, -10.4].map((x, i) => ({
    id: `lounge-${i + 4}`,
    kind: 'sofa' as const,
    tableId: 'lounge',
    x,
    z: 7.9,
    yaw: Math.PI,
    out: { x, z: 7.1 },
  })),
  ...[...LOUNGE.beanbags, ...LOUNGE.cushions].map((b, i) => ({
    id: `lounge-${i + 6}`,
    kind: 'sofa' as const,
    tableId: 'lounge',
    x: b.x,
    z: b.z,
    yaw: -Math.PI / 2,
    out: { x: b.x + b.r + 0.4, z: b.z },
  })),
];

// ---------- F. Open floor ----------

/** A four-colour rug: one quarter per Pick a Side zone. */
export const FLOOR_AREA = rect(-4.2, 5.1, 6.0, 5.4);

// ---------- Entrance ----------

export const DOORMAT = rect(0, 8.3, 1.8, 1.0);
export const TEA_CART = { minX: -2.6, maxX: -1.4, minZ: 8.0, maxZ: 8.7 } as const;
/** The Buddy Machine by the door, facing into the room (−z). */
export const GACHA_MACHINE = { x: 2.0, z: 8.2, yaw: Math.PI, reach: 1.7 } as const;
export const COAT_STAND = { x: 3.2, z: 8.5 } as const;

// ---------- G. Card tables ----------

/** Two round oak tables with a felt inlay, four stools each; room is kept for a third. */
export const CARD_TABLES: CardTable[] = [
  { id: 'game1', x: 4.3, z: 3.6, r: 0.62, area: rect(4.3, 3.6, 3.0, 3.0) },
  { id: 'game2', x: 4.3, z: 7.0, r: 0.62, area: rect(4.3, 7.0, 3.0, 3.0) },
];
const CARD_SEATS: Seat[] = CARD_TABLES.flatMap(cardSeats);

// ---------- H. Werewolf circle ----------

export const WOLF = { x: 9.6, z: 5.5, tableR: 0.55, cushionR: 1.55, area: circle(9.6, 5.5, 2.6) };
export const WOLF_SEATS: Seat[] = wolfSeats(WOLF);

// ---------- I. Art corner ----------

export const ART_AREA = rect(10.7, -0.8, 4.2, 4.4);
export const EASELS = [
  { x: 12.3, z: -1.9 },
  { x: 12.3, z: 0.2 },
  { x: 9.2, z: 0.9 },
  { x: 11.3, z: 1.1 },
].map((e) => ({ ...e, yaw: Math.atan2(ART_AREA.x - e.x, ART_AREA.z - e.z) }));
export const PAINT_CART = { x: 9.1, z: -2.5 } as const;
/** A folding screen along the back of the rug; its frames show Draw & Guess's last reveal. */
export const GALLERY = { x: 10.7, z: -2.85, width: 2.6, height: 1.9, y: 1.3, yaw: 0 } as const;

// ---------- Decor ----------

export const PLANTS = [
  { x: 12.5, z: 8.5, s: 1 },
  { x: -12.5, z: -8.5, s: 0.9 },
  { x: -12.5, z: 3.0, s: 0.9 },
  { x: 7.6, z: -0.6, s: 0.8 },
  { x: -8.0, z: 8.5, s: 0.9 },
  { x: 6.5, z: 8.7, s: 0.8 },
  { x: 12.6, z: -4.9, s: 0.9 },
];
export const CAT_TOWER = { x: 12.4, z: 2.3 } as const;
export const GLOBE = { x: -0.6, z: -0.3 } as const;
/** Tall shelves along the back wall (x ranges), a rolling ladder on the left one. */
export const SHELVES = [
  { x0: -12.7, x1: -6.6, ladder: true },
  { x0: -0.6, x1: 7.0, ladder: false },
];
export const BIG_WINDOW = { x: -3.6, width: 3.2 } as const;
export const BAY_WINDOW = { x: 10.5, width: 4.4 } as const;

// ---------- Private zones ----------

/** Only the people inside hear each other; nobody outside hears in. No locks (feature 6). */
export const ZONES: Zone[] = [
  { id: 'fire', name: 'Fireside', emoji: '🔥', area: FIRESIDE.zone },
  { id: 'booth', name: 'Window booth', emoji: '🪟', area: BOOTH.zone },
];

// ---------- Seats, collisions, cats ----------

export const SEATS: Seat[] = [...DESK_SEATS, ...BOOTH_SEATS, ...FIRESIDE_SEATS, ...LOUNGE_SEATS, ...CARD_SEATS, ...WOLF_SEATS];
export const SEAT_BY_ID: ReadonlyMap<string, Seat> = new Map(SEATS.map((s) => [s.id, s]));

const box = (minX: number, maxX: number, minZ: number, maxZ: number): Obstacle => ({ kind: 'box', minX, maxX, minZ, maxZ });
const disc = (x: number, z: number, r: number): Obstacle => ({ kind: 'circle', x, z, r });

/** Fixed furniture footprints the player cannot walk through. */
export const OBSTACLES: Obstacle[] = [
  ...STUDY_TABLES.map((t) => box(t.x - t.width / 2, t.x + t.width / 2, t.z - t.depth / 2, t.z + t.depth / 2)),
  ...SHELVES.map((s) => box(s.x0, s.x1, -HD, -HD + 0.7)),
  box(BOOTH.bench.minX, BOOTH.bench.maxX, BOOTH.bench.minZ, BOOTH.bench.maxZ),
  box(
    BOOTH.table.x - BOOTH.table.w / 2,
    BOOTH.table.x + BOOTH.table.w / 2,
    BOOTH.table.z - BOOTH.table.d / 2,
    BOOTH.table.z + BOOTH.table.d / 2,
  ),
  disc(CHALK_CART.x, CHALK_CART.z, 0.3),
  box(
    -HW,
    FIRESIDE.hearth.x + FIRESIDE.hearth.depth / 2,
    FIRESIDE.hearth.z - FIRESIDE.hearth.width / 2,
    FIRESIDE.hearth.z + FIRESIDE.hearth.width / 2,
  ),
  box(FIRESIDE.loveseat.x - 0.4, FIRESIDE.loveseat.x + 0.35, -0.25, 1.25),
  ...FIRESIDE.armchairs.map((c) => box(c.x - 0.42, c.x + 0.42, c.z - 0.4, c.z + 0.4)),
  disc(FIRESIDE.sideTable.x, FIRESIDE.sideTable.z, FIRESIDE.sideTable.r),
  disc(FIRESIDE.lamp.x, FIRESIDE.lamp.z, 0.25),
  box(LOUNGE.console.minX, LOUNGE.console.maxX, LOUNGE.console.minZ, LOUNGE.console.maxZ),
  box(LOUNGE.sofaRun.minX, LOUNGE.sofaRun.maxX, LOUNGE.sofaRun.minZ, LOUNGE.sofaRun.maxZ),
  box(LOUNGE.sofaArm.minX, LOUNGE.sofaArm.maxX, LOUNGE.sofaArm.minZ, LOUNGE.sofaArm.maxZ),
  ...LOUNGE.beanbags.map((b) => disc(b.x, b.z, b.r)),
  ...LOUNGE.cushions.map((b) => disc(b.x, b.z, b.r)),
  disc(LOUNGE.lamp.x, LOUNGE.lamp.z, 0.25),
  box(TEA_CART.minX, TEA_CART.maxX, TEA_CART.minZ, TEA_CART.maxZ),
  disc(GACHA_MACHINE.x, GACHA_MACHINE.z, 0.5),
  disc(COAT_STAND.x, COAT_STAND.z, 0.25),
  ...CARD_TABLES.map((t) => disc(t.x, t.z, t.r)),
  disc(WOLF.x, WOLF.z, WOLF.tableR),
  ...EASELS.map((e) => disc(e.x, e.z, 0.3)),
  disc(PAINT_CART.x, PAINT_CART.z, 0.3),
  box(GALLERY.x - GALLERY.width / 2, GALLERY.x + GALLERY.width / 2, GALLERY.z - 0.2, GALLERY.z + 0.15),
  ...PLANTS.map((p) => disc(p.x, p.z, 0.35)),
  box(CAT_TOWER.x - 0.35, CAT_TOWER.x + 0.35, CAT_TOWER.z - 0.35, CAT_TOWER.z + 0.35),
  disc(GLOBE.x, GLOBE.z, 0.3),
];

export const WORLD: World = { bounds: BOUNDS, obstacles: OBSTACLES };
const nav = createNavigator(WORLD);
export const { isWalkable, nearestWalkable, findPath, randomWalkable } = nav;
/** Push a walker out of this map's furniture, other walkers and the walls. */
export const resolveCollisions = (p: { x: number; z: number }, others: Iterable<Walker>, radius?: number) =>
  resolveIn(p, others, radius, WORLD);

/** Where every new room's resident cat starts: by the lounge rug. */
export const STARTER_CAT = { x: -11.7, z: 5.0 } as const;

/** Where new buddies pop out: just in front of the machine. */
export const NPC_SPAWN = {
  x: GACHA_MACHINE.x + Math.sin(GACHA_MACHINE.yaw) * 1.0,
  z: GACHA_MACHINE.z + Math.cos(GACHA_MACHINE.yaw) * 1.0,
} as const;

/** Cosy places a cat likes to nap. `y` lifts it onto furniture. */
export const NAP_SPOTS: { x: number; z: number; y: number }[] = [
  { x: -9.8, z: 7.9, y: 0.45 }, // the sofa's corner, where nobody sits
  { x: 12.15, z: -7.9, y: BOOTH.bench.seatY }, // end of the window bench
  { x: -12.1, z: 1.95, y: 0 }, // the hearth
  { x: -9.6, z: -8.45, y: 1.48 }, // a shelf
  { x: WOLF.x, z: WOLF.z + WOLF.cushionR, y: 0.12 }, // a Werewolf cushion
];

export const LIBRARY: MapData = {
  id: 'library',
  name: 'Cosy Library',
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
export const zoneAt = (x: number, z: number) => zoneAtIn(LIBRARY, x, z);
