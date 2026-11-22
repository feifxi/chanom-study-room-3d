import type { Navigator } from '../navigation.js';
import type { Obstacle, Seat, Walker } from '../world.js';

/**
 * What a map is (feature 7): the walkable world, the seats and the standard kit's places (as areas).
 * Shared by the web app (which adds each map's 3D look) and the game server (seats, collisions, zones).
 * One file per template builds one of these. Once maps are data, the map file becomes JSON and the
 * kit check reads the same fields.
 */

// ---------- Areas: a rug (rectangle) or a round rug ----------

export type RectArea = { kind: 'rect'; x: number; z: number; w: number; d: number };
export type CircleArea = { kind: 'circle'; x: number; z: number; r: number };
export type Area = RectArea | CircleArea;

export const rect = (x: number, z: number, w: number, d: number): RectArea => ({ kind: 'rect', x, z, w, d });
export const circle = (x: number, z: number, r: number): CircleArea => ({ kind: 'circle', x, z, r });

export function inArea(a: Area, x: number, z: number) {
  return a.kind === 'circle' ? Math.hypot(x - a.x, z - a.z) <= a.r : Math.abs(x - a.x) <= a.w / 2 && Math.abs(z - a.z) <= a.d / 2;
}

/** Half the shortest span: how far from the middle you can go in every direction. */
export const areaRadius = (a: Area) => (a.kind === 'circle' ? a.r : Math.min(a.w, a.d) / 2);

/** Distance from the middle to the edge along a heading (radians, atan2(dx, dz) convention). */
function edgeDistance(a: Area, angle: number) {
  if (a.kind === 'circle') return a.r;
  const sx = Math.abs(Math.sin(angle)) || 1e-9;
  const cz = Math.abs(Math.cos(angle)) || 1e-9;
  return Math.min(a.w / 2 / sx, a.d / 2 / cz);
}

/** A point just outside the area along a heading (`pad` metres past the edge). */
export function areaEdgePoint(a: Area, angle: number, pad: number) {
  const t = edgeDistance(a, angle) + pad;
  return { x: a.x + Math.sin(angle) * t, z: a.z + Math.cos(angle) * t };
}

/** A point inside the area along a heading, `frac` of the way from the middle to the edge. */
export function areaInnerPoint(a: Area, angle: number, frac: number) {
  const t = edgeDistance(a, angle) * frac;
  return { x: a.x + Math.sin(angle) * t, z: a.z + Math.cos(angle) * t };
}

// ---------- Kit pieces ----------

export interface Zone {
  id: string;
  name: string;
  emoji: string;
  area: Area;
}

export interface CardTable {
  id: string;
  x: number;
  z: number;
  r: number;
  area: Area;
  /** Stools round it (4 when unset; the Library's card table has 6, its chess table 2). */
  stools?: number;
  /** How far the stools stand from the middle (1 m when unset). */
  stoolR?: number;
}

const STOOL_DISTANCE = 1.0;
const STAND_BACK = 0.5;
/**
 * Stools evenly round a table, facing the middle. Four sit on the diagonals (they read better from
 * the isometric camera than a plus shape); other counts are turned half a step, so two face each
 * other across the table from left and right.
 */
export const cardSeats = (t: CardTable): Seat[] => {
  const n = t.stools ?? 4;
  return Array.from({ length: n }, (_, i): Seat => {
    const a = n === 4 ? Math.PI / 4 + (i * Math.PI) / 2 : ((i + 0.5) / n) * Math.PI * 2;
    const r = t.stoolR ?? STOOL_DISTANCE;
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    return {
      id: `${t.id}-${i}`,
      kind: 'chair',
      tableId: t.id,
      x: t.x + dx * r,
      z: t.z + dz * r,
      yaw: a + Math.PI,
      out: { x: t.x + dx * (r + STAND_BACK), z: t.z + dz * (r + STAND_BACK) },
    };
  });
};
/** Seats that belong to an activity (card tables, the art table): sitting there joins it. */
export const isGameSeat = (seatId: string) => seatId.startsWith('game') || seatId.startsWith('art-') || seatId.startsWith('chess-');

/** A round art table with stools all round: Draw & Guess sits here in maps that have one. */
export interface ArtTable {
  x: number;
  z: number;
  tableR: number;
  stoolR: number;
  stools: number;
  area: Area;
}
/** Stools evenly round the art table, facing the middle (half a step turned, so none sits dead ahead of the camera). */
export const artSeats = (t: ArtTable): Seat[] =>
  Array.from({ length: t.stools }, (_, i) => {
    const a = ((i + 0.5) / t.stools) * Math.PI * 2;
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    return {
      id: `art-${i}`,
      kind: 'chair',
      tableId: 'art',
      x: t.x + dx * t.stoolR,
      z: t.z + dz * t.stoolR,
      yaw: a + Math.PI,
      out: { x: t.x + dx * (t.stoolR + STAND_BACK), z: t.z + dz * (t.stoolR + STAND_BACK) },
    };
  });

/** A low round table with cushions all round and a lantern: somewhere to sit and hang out (no game). */
export interface CushionCircle {
  x: number;
  z: number;
  tableR: number;
  cushionR: number;
  area: Area;
}
/** Twelve cushions round the lantern table, facing the middle. */
export const circleSeats = (w: CushionCircle): Seat[] =>
  Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    return {
      id: `circle-${i}`,
      // A cushion is for hanging out: no laptop, no table screen share, sit right down on the floor
      kind: 'sofa',
      low: true,
      tableId: 'circle',
      x: w.x + dx * w.cushionR,
      z: w.z + dz * w.cushionR,
      yaw: a + Math.PI,
      out: { x: w.x + dx * (w.cushionR + 0.6), z: w.z + dz * (w.cushionR + 0.6) },
    };
  });

/** A screen or board on a wall: where it hangs, how big the picture is and which way it faces (π/2 = into the room from the left wall, 0 = from the back wall). */
export interface WallPanel {
  x: number;
  z: number;
  y: number;
  width: number;
  height: number;
  yaw: number;
}

export interface MapData {
  id: string;
  name: string;
  room: { width: number; depth: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  spawn: { x: number; z: number };
  seats: Seat[];
  seatById: ReadonlyMap<string, Seat>;
  /** Desk chairs with a laptop: study spots, and where study buddies sit. */
  deskSeats: Seat[];
  obstacles: Obstacle[];
  zones: Zone[];
  /**
   * Private zones' names float over them like name tags (see ZoneTags) instead of a plaque hanging in
   * the scene. The library has switched; the other maps still hang plaques until their own pass.
   */
  floatingZoneTags?: boolean;
  /** The standard kit's places (feature 7). */
  cardTables: CardTable[];
  circle: CushionCircle;
  floorArea: Area;
  tvArea: Area;
  boardArea: Area;
  artArea: Area;
  /** Draw & Guess at a round table with stools (sit to join) instead of standing at easels. */
  artTable?: ArtTable;
  /** A two-stool chess table (the Library for now; the other maps get theirs when they're redone). */
  chessTable?: CardTable;
  tv: WallPanel;
  board: WallPanel;
  gacha: { x: number; z: number; yaw: number; reach: number };
  starterCat: { x: number; z: number };
  npcSpawn: { x: number; z: number };
  napSpots: { x: number; z: number; y: number }[];
  nav: Navigator;
  resolveCollisions: (p: { x: number; z: number }, others: Iterable<Walker>, radius?: number) => void;
}

export const zoneAtIn = (map: { zones: Zone[] }, x: number, z: number): Zone | undefined => map.zones.find((zn) => inArea(zn.area, x, z));
