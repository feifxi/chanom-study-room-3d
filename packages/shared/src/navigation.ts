import { BOUNDS, OBSTACLES } from './layout';

/**
 * Grid navigation for NPCs: a 0.4 m occupancy grid built from the furniture,
 * A* over it, then the path is shortened by skipping waypoints that are in
 * plain line of sight.
 */
const CELL = 0.4;
const CLEARANCE = 0.32;
/** Extra margin for grid cells, so straight steps between cell centres never clip furniture. */
const GRID_MARGIN = 0.14;
const COLS = Math.ceil((BOUNDS.maxX - BOUNDS.minX) / CELL) + 1;
const ROWS = Math.ceil((BOUNDS.maxZ - BOUNDS.minZ) / CELL) + 1;

export interface Point {
  x: number;
  z: number;
}

function blockedAt(x: number, z: number, margin = 0) {
  const c = CLEARANCE + margin;
  return OBSTACLES.some((o) =>
    o.kind === 'circle' ? Math.hypot(x - o.x, z - o.z) < o.r + c : x > o.minX - c && x < o.maxX + c && z > o.minZ - c && z < o.maxZ + c,
  );
}

let grid: Uint8Array | null = null;
function getGrid() {
  if (grid) return grid;
  grid = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const [x, z] = toWorld(c, r);
      grid[r * COLS + c] = blockedAt(x, z, GRID_MARGIN) ? 1 : 0;
    }
  }
  return grid;
}

const toCell = (p: Point): [number, number] => [
  Math.min(COLS - 1, Math.max(0, Math.round((p.x - BOUNDS.minX) / CELL))),
  Math.min(ROWS - 1, Math.max(0, Math.round((p.z - BOUNDS.minZ) / CELL))),
];
function toWorld(c: number, r: number): [number, number] {
  return [BOUNDS.minX + c * CELL, BOUNDS.minZ + r * CELL];
}

export function isWalkable(p: Point) {
  return p.x >= BOUNDS.minX && p.x <= BOUNDS.maxX && p.z >= BOUNDS.minZ && p.z <= BOUNDS.maxZ && !blockedAt(p.x, p.z);
}

/** Nearest open grid-cell centre (A* only moves between these), optionally one in plain sight of `p`. */
function nearestOpenCell(p: Point, visible = false): Point {
  const g = getGrid();
  const [c0, r0] = toCell(p);
  for (let ring = 0; ring < 12; ring++) {
    let best: Point | null = null;
    let bestD = Infinity;
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS || g[r * COLS + c]) continue;
        const [x, z] = toWorld(c, r);
        const q = { x, z };
        if (visible && !lineOfSight(p, q)) continue;
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < bestD) {
          bestD = d;
          best = q;
        }
      }
    }
    if (best) return best;
  }
  return p;
}

/** The point itself when it's walkable, else the nearest walkable cell centre (for targets inside furniture). */
export function nearestWalkable(p: Point): Point {
  if (isWalkable(p)) return { x: p.x, z: p.z };
  const g = getGrid();
  const [c0, r0] = toCell(p);
  for (let ring = 0; ring < 12; ring++) {
    let best: Point | null = null;
    let bestD = Infinity;
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS || g[r * COLS + c]) continue;
        const [x, z] = toWorld(c, r);
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < bestD) {
          bestD = d;
          best = { x, z };
        }
      }
    }
    if (best) return best;
  }
  return p;
}

/** Exact test: does segment a→b stay clear of every (inflated) obstacle? */
function lineOfSight(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  for (const o of OBSTACLES) {
    if (o.kind === 'circle') {
      // Closest point on the segment to the circle centre
      const len2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / len2));
      if (Math.hypot(a.x + dx * t - o.x, a.z + dz * t - o.z) < o.r + CLEARANCE) return false;
      continue;
    }
    // Slab test against the inflated box
    let t0 = 0;
    let t1 = 1;
    const slabs: [number, number, number, number][] = [
      [a.x, dx, o.minX - CLEARANCE, o.maxX + CLEARANCE],
      [a.z, dz, o.minZ - CLEARANCE, o.maxZ + CLEARANCE],
    ];
    let hit = true;
    for (const [p0, d, lo, hi] of slabs) {
      if (Math.abs(d) < 1e-9) {
        if (p0 <= lo || p0 >= hi) {
          hit = false;
          break;
        }
        continue;
      }
      let ta = (lo - p0) / d;
      let tb = (hi - p0) / d;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      if (t0 >= t1) {
        hit = false;
        break;
      }
    }
    if (hit) return false;
  }
  return true;
}

/** Waypoints from `from` to `to` (excluding `from`), or [] when no route exists. */
export function findPath(from: Point, to: Point): Point[] {
  const g = getGrid();
  const goal = isWalkable(to) ? to : nearestWalkable(to);
  if (lineOfSight(from, goal)) return [goal];

  const [sc, sr] = toCell(nearestOpenCell(from, true));
  const [gc, gr] = toCell(nearestOpenCell(goal));
  const start = sr * COLS + sc;
  const target = gr * COLS + gc;
  const cost = new Float32Array(COLS * ROWS).fill(Infinity);
  const prev = new Int32Array(COLS * ROWS).fill(-1);
  const open: { i: number; f: number }[] = [{ i: start, f: 0 }];
  cost[start] = 0;
  const h = (i: number) => Math.hypot((i % COLS) - gc, Math.floor(i / COLS) - gr);

  while (open.length) {
    // Small grid (~50×34): a linear scan for the best node is plenty fast
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (open[k]!.f < open[bi]!.f) bi = k;
    const { i } = open.splice(bi, 1)[0]!;
    if (i === target) break;
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        const n = nr * COLS + nc;
        if (g[n]) continue;
        // No cutting corners past furniture
        if (dr && dc && (g[r * COLS + nc] || g[nr * COLS + c])) continue;
        const next = cost[i]! + (dr && dc ? Math.SQRT2 : 1);
        if (next < cost[n]!) {
          cost[n] = next;
          prev[n] = i;
          open.push({ i: n, f: next + h(n) });
        }
      }
    }
  }
  if (prev[target] === -1 && target !== start) return [];

  const cells: Point[] = [];
  for (let i = target; i !== -1; i = prev[i]!) {
    const [x, z] = toWorld(i % COLS, Math.floor(i / COLS));
    cells.unshift({ x, z });
    if (i === start) break;
  }
  cells.push(goal);

  // String-pull: keep only the waypoints needed to steer around furniture
  const path: Point[] = [];
  let anchor = from;
  for (let k = 0; k < cells.length; k++) {
    const next = cells[k + 1];
    if (!next || !lineOfSight(anchor, next)) {
      path.push(cells[k]!);
      anchor = cells[k]!;
    }
  }
  return path;
}

/** A random walkable spot, optionally inside an area. */
export function randomWalkable(rand: () => number, area = BOUNDS as { minX: number; maxX: number; minZ: number; maxZ: number }): Point {
  for (let tries = 0; tries < 40; tries++) {
    const p = { x: area.minX + rand() * (area.maxX - area.minX), z: area.minZ + rand() * (area.maxZ - area.minZ) };
    if (isWalkable(p)) return p;
  }
  return nearestWalkable({ x: (area.minX + area.maxX) / 2, z: (area.minZ + area.maxZ) / 2 });
}
