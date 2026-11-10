import type { Navigator, Obstacle, Seat, Walker } from '@study/shared';
import type { ReactNode } from 'react';
import type { DayLight } from '../room3d/dayCycle';

/**
 * What a map is, to the room code (feature 7): the walkable world, the seats, the standard kit's
 * places (as areas) and the 3D look. One file per template (`library.ts`, `cafe.ts`) builds one of
 * these; `active.ts` says which one the room is in. Once maps are data, the map file becomes JSON and
 * the kit check reads the same fields.
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
}

const STOOL_DISTANCE = 1.0;
const STAND_BACK = 0.5;
/** Four stools on the diagonals (they read better from the isometric camera than a plus shape). */
export const cardSeats = (t: CardTable): Seat[] =>
  [0, 1, 2, 3].map((i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    return {
      id: `${t.id}-${i}`,
      kind: 'chair',
      tableId: t.id,
      x: t.x + dx * STOOL_DISTANCE,
      z: t.z + dz * STOOL_DISTANCE,
      yaw: a + Math.PI,
      out: { x: t.x + dx * (STOOL_DISTANCE + STAND_BACK), z: t.z + dz * (STOOL_DISTANCE + STAND_BACK) },
    };
  });
export const isGameSeat = (seatId: string) => seatId.startsWith('game');

export interface Werewolf {
  x: number;
  z: number;
  tableR: number;
  cushionR: number;
  area: Area;
}
/** Twelve cushions round the table, facing the middle. */
export const wolfSeats = (w: Werewolf): Seat[] =>
  Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    return {
      id: `wolf-${i}`,
      kind: 'chair',
      tableId: 'wolf',
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

export interface MapDef {
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
  /** The standard kit's places (feature 7). */
  cardTables: CardTable[];
  wolf: Werewolf;
  floorArea: Area;
  tvArea: Area;
  boardArea: Area;
  artArea: Area;
  tv: WallPanel;
  board: WallPanel;
  gacha: { x: number; z: number; yaw: number; reach: number };
  starterCat: { x: number; z: number };
  npcSpawn: { x: number; z: number };
  napSpots: { x: number; z: number; y: number }[];
  nav: Navigator;
  resolveCollisions: (p: { x: number; z: number }, others: Iterable<Walker>, radius?: number) => void;
  /** The 3D look. */
  Scene: (props: { light: DayLight; shadows?: boolean }) => ReactNode;
}

/** A map file's half: everything but the 3D look, which `active.ts` attaches (keeps data files free of scene imports). */
export type MapData = Omit<MapDef, 'Scene'>;

export const zoneAtIn = (map: { zones: Zone[] }, x: number, z: number): Zone | undefined => map.zones.find((zn) => inArea(zn.area, x, z));
