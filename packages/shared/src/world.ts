/**
 * The walkable world of one map, shared by the client (rendering, prediction) and the game server
 * (seat checks, NPC movement). Units are metres; +z faces the camera. Each map file supplies its own.
 */

export interface Point {
  x: number;
  z: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type Obstacle = ({ kind: 'box' } & Bounds) | { kind: 'circle'; x: number; z: number; r: number };

/** A map's bounds and furniture: everything a navigator or collision pass needs. */
export interface World {
  bounds: Bounds;
  obstacles: readonly Obstacle[];
}

export interface Seat {
  id: string;
  /** Desk chairs come with a laptop; the sofa is just for lounging. */
  kind: 'chair' | 'sofa';
  /** Seats sharing a group see each other's screen shares (a table, or the sofa). */
  tableId: string;
  x: number;
  z: number;
  /** Facing angle (radians, atan2(dx, dz) convention) when seated. */
  yaw: number;
  /** Where you end up when you stand up. */
  out: Point;
  /** A floor cushion: you sit right down on the floor, not at chair height. */
  low?: boolean;
}

export interface Table {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
}

/** Something else walking around: a player or an NPC, with an optional body radius. */
export interface Walker {
  x: number;
  z: number;
  r?: number;
}
