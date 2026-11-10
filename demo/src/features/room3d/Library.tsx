'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DayLight } from './dayCycle';
import { CHAIR_BACK } from './Avatar';
import { StaticBatch } from './StaticBatch';
import { BigScreen, CardTables } from '../activities/Activity3D';
import { WhiteboardFrame } from '../activities/board/Board3D';
import { zoneShapes } from '../activities/pickASide/Side3D';
import { ArtCorner } from '../activities/telephone/ArtCorner3D';
import {
  ART_AREA,
  BAY_WINDOW,
  BIG_WINDOW,
  BOARD_AREA,
  BOOTH,
  CARD_TABLES,
  CAT_TOWER,
  CHALK_CART,
  COAT_STAND,
  DESK_SEATS,
  DOORMAT,
  FIRESIDE,
  FLOOR_AREA,
  GLOBE,
  LOUNGE,
  PLANTS,
  ROOM,
  SHELVES,
  STUDY_RUGS,
  STUDY_TABLES,
  TEA_CART,
  WOLF,
  WOLF_SEATS,
  ZONES,
  EASELS,
  GALLERY,
  PAINT_CART,
  type StudyTable as StudyTableDef,
} from '../map/library';
import type { Area, RectArea, Werewolf, Zone } from '../map/types';
import type { Seat } from '@study/shared';

/**
 * The Cosy Library's look (layout in `features/map/library.ts`). Everything here is static and
 * merges into a few draw calls (StaticBatch) except the few things that move or glow on their own:
 * the fire, the clock hands and the bulbs. Colours: oak and walnut wood, cream walls, warm rugs.
 */

const W = ROOM.width;
const D = ROOM.depth;
const WALL_H = 4.2;

export const OAK = '#8a6244';
export const OAK_LIGHT = '#b98a5e';
export const WALNUT = '#6b4a33';
export const CREAM = '#f3ede4';
const STONE = '#b9ada0';
export const BRASS = '#c9a24a';
const TRIM = '#d9c8ad';
export const CREAM_SOFT = '#f1e4d6';
export const IRON = '#3a3036';
export const PINK = '#e9a9c2';
export const BLUE = '#a9cde3';
export const YELLOW = '#e8d49a';
export const GREEN = '#b7d6b0';
export const LAVENDER = '#c9b6d9';
export const RUG_RED = '#b5565f';
export const RUG_RED_EDGE = '#8f4149';
export const RUG_GREEN = '#5f7f6a';
export const RUG_GREEN_EDGE = '#4a6655';
export const RUG_LAVENDER_EDGE = '#a893bf';
export const RUG_CREAM = '#e8dcc8';
export const RUG_CREAM_EDGE = '#cbb89c';
const BOOK_COLORS = ['#7c5cff', '#2f80ed', '#e0457b', '#12a37f', '#ef8a3c', '#f2c46d', '#8a5a3a', '#46527f'];

export function Box({
  size,
  position,
  color,
  rotation,
  cast = true,
  roughness = 0.85,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  cast?: boolean;
  roughness?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

export function Cyl({
  r,
  h,
  position,
  color,
  r2,
  segments = 16,
  cast = true,
}: {
  r: number;
  h: number;
  position: [number, number, number];
  color: string;
  r2?: number;
  segments?: number;
  cast?: boolean;
}) {
  return (
    <mesh position={position} castShadow={cast} receiveShadow>
      <cylinderGeometry args={[r, r2 ?? r, h, segments]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

/** Small deterministic PRNG (Park–Miller), so the shelves look the same on every visit. */
export function seededRandom(seed: number) {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

// ---------- Floor, walls, rugs ----------

/** A rug on the floor: the shape of an area, with an optional darker border. */
export function Rug({ area, color, border, y = 0.012 }: { area: Area; color: string; border?: string; y?: number }) {
  const pad = 0.14;
  const plane = (c: string, grow: number, yy: number) =>
    area.kind === 'circle' ? (
      <mesh position={[0, yy, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[area.r + grow, 48]} />
        <meshStandardMaterial color={c} roughness={1} />
      </mesh>
    ) : (
      <mesh position={[0, yy, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[area.w + grow * 2, area.d + grow * 2]} />
        <meshStandardMaterial color={c} roughness={1} />
      </mesh>
    );
  return (
    <group position={[area.x, 0, area.z]}>
      {border && plane(border, pad, y - 0.004)}
      {plane(color, 0, y)}
    </group>
  );
}

/** The open floor: a rug woven in four soft colours, one per Pick a Side zone (same cut as the game). */
/** Mid-tone wool colours for the zones (pastels turned to glass under the night light). */
export const FLOOR_RUG_COLORS = ['#d9a0b2', '#a4bedf', '#dcc48f', '#a3cbb4'];
export function FourColourRug({
  area,
  colors = FLOOR_RUG_COLORS,
  base = RUG_CREAM,
  border = RUG_LAVENDER_EDGE,
}: {
  area: RectArea;
  colors?: string[];
  base?: string;
  border?: string;
}) {
  const shapes = useMemo(() => zoneShapes(area, 4), [area]);
  return (
    <group position={[area.x, 0, area.z]}>
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[area.w + 0.28, area.d + 0.28]} />
        <meshStandardMaterial color={border} roughness={1} />
      </mesh>
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[area.w, area.d]} />
        <meshStandardMaterial color={base} roughness={1} />
      </mesh>
      <group position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {shapes.map((s, i) => (
          <mesh key={i} receiveShadow>
            <shapeGeometry args={[s]} />
            <meshStandardMaterial color={colors[i]} roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Shell({ windowColor }: { windowColor: string }) {
  const planks = useMemo(() => Array.from({ length: Math.floor(D / 0.9) }, (_, i) => -D / 2 + 0.9 * (i + 1)), []);
  return (
    <group>
      {/* Floor slab with plank seams, cream walls, a wainscot band and skirting */}
      <Box size={[W, 0.4, D]} position={[0, -0.2, 0]} color="#dcbf98" cast={false} />
      {planks.map((z) => (
        <Box key={z} size={[W, 0.006, 0.025]} position={[0, 0.002, z]} color="#c9a87f" cast={false} />
      ))}
      <Box size={[W + 0.4, WALL_H, 0.2]} position={[0, WALL_H / 2, -D / 2 - 0.1]} color={CREAM} />
      <Box size={[0.2, WALL_H, D]} position={[-W / 2 - 0.1, WALL_H / 2, 0]} color={CREAM} />
      <Box size={[W, 1.0, 0.03]} position={[0, 0.5, -D / 2 + 0.015]} color={TRIM} cast={false} />
      <Box size={[0.03, 1.0, D]} position={[-W / 2 + 0.015, 0.5, 0]} color={TRIM} cast={false} />
      <Box size={[W, 0.16, 0.05]} position={[0, 0.08, -D / 2 + 0.03]} color={TRIM} cast={false} />
      <Box size={[0.05, 0.16, D]} position={[-W / 2 + 0.03, 0.08, 0]} color={TRIM} cast={false} />
      {/* Picture rail */}
      <Box size={[W, 0.05, 0.04]} position={[0, 3.4, -D / 2 + 0.02]} color={TRIM} cast={false} />
      <Box size={[0.04, 0.05, D]} position={[-W / 2 + 0.02, 3.4, 0]} color={TRIM} cast={false} />
      <ArchedWindow x={BIG_WINDOW.x} width={BIG_WINDOW.width} color={windowColor} />
      <BayWindow color={windowColor} />
    </group>
  );
}

/** A tall arched window on the back wall, over the long tables. */
function ArchedWindow({ x, width, color }: { x: number; width: number; color: string }) {
  const h = 2.4;
  const y = 2.1;
  return (
    <group position={[x, y, -D / 2 + 0.02]}>
      <Box size={[width + 0.24, h + 0.24, 0.1]} position={[0, 0, 0]} color={CREAM} cast={false} />
      <mesh position={[0, h / 2, 0.055]}>
        <circleGeometry args={[width / 2 + 0.12, 32, 0, Math.PI]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>
      {/* Glass: the rectangle and the arch in one mesh (it changes colour with the sky, so it can't batch) */}
      <mesh position={[0, 0, 0.065]}>
        <shapeGeometry args={[archShape(width, h)]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {[-1, 0, 1].map((i) => (
        <Box key={i} size={[0.06, h + width / 2, 0.04]} position={[i * (width / 3), width / 4, 0.09]} color={CREAM} cast={false} />
      ))}
      <Box size={[width, 0.06, 0.04]} position={[0, 0.3, 0.09]} color={CREAM} cast={false} />
      <Box size={[width, 0.06, 0.04]} position={[0, -0.7, 0.09]} color={CREAM} cast={false} />
      <Box size={[width + 0.4, 0.08, 0.3]} position={[0, -h / 2 - 0.1, 0.14]} color={CREAM} cast={false} />
    </group>
  );
}

function archShape(width: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, -h / 2);
  s.lineTo(width / 2, -h / 2);
  s.lineTo(width / 2, h / 2);
  s.absarc(0, h / 2, width / 2, 0, Math.PI, false);
  s.lineTo(-width / 2, -h / 2);
  return s;
}

/** Three panes over the window booth's bench: one sheet of glass, mullions on top. */
function BayWindow({ color }: { color: string }) {
  const pane = BAY_WINDOW.width / 3;
  return (
    <group position={[BAY_WINDOW.x, 2.15, -D / 2 + 0.02]}>
      <Box size={[BAY_WINDOW.width + 0.24, 1.9, 0.1]} position={[0, 0, 0]} color={CREAM} cast={false} />
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[BAY_WINDOW.width - 0.12, 1.66]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {[-0.5, 0.5].map((i) => (
        <Box key={i} size={[0.1, 1.66, 0.04]} position={[i * pane, 0, 0.09]} color={CREAM} cast={false} />
      ))}
      <Box size={[BAY_WINDOW.width, 0.05, 0.04]} position={[0, 0.25, 0.09]} color={CREAM} cast={false} />
      <Box size={[BAY_WINDOW.width + 0.4, 0.08, 0.34]} position={[0, -0.99, 0.16]} color={CREAM} cast={false} />
    </group>
  );
}

// ---------- A. Study block ----------

/** Tall shelf with books drawn as a single InstancedMesh, and a rolling ladder on the first one. */
function Bookshelf({ x0, x1, ladder }: { x0: number; x1: number; ladder: boolean }) {
  const width = x1 - x0;
  const cx = (x0 + x1) / 2;
  const z = -D / 2 + 0.35;
  const height = 3.2;
  const rows = [0.25, 0.85, 1.45, 2.05, 2.65];
  const books = useMemo(() => {
    const list: { x: number; y: number; w: number; h: number; color: string }[] = [];
    const rand = seededRandom(Math.floor(x0 * 1000) + 7);
    for (const shelfY of rows) {
      let bx = x0 + 0.12;
      while (bx < x1 - 0.2) {
        const w = 0.07 + rand() * 0.07;
        const h = 0.36 + rand() * 0.16;
        if (rand() > 0.08)
          list.push({ x: bx + w / 2, y: shelfY + h / 2, w, h, color: BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)]! });
        bx += w + 0.01;
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x0, x1]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    books.forEach((b, i) => {
      m.makeScale(b.w, b.h, 0.3);
      m.setPosition(b.x, b.y, z + 0.05);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [books, z]);
  const dividers = Math.max(1, Math.round(width / 1.6));
  return (
    <group>
      <Box size={[width, height, 0.06]} position={[cx, height / 2, z - 0.3]} color={WALNUT} />
      {rows.map((y) => (
        <Box key={y} size={[width, 0.06, 0.62]} position={[cx, y, z]} color={OAK_LIGHT} />
      ))}
      <Box size={[width, 0.08, 0.66]} position={[cx, height, z]} color={OAK_LIGHT} />
      {Array.from({ length: dividers + 1 }, (_, i) => x0 + (i * width) / dividers).map((x) => (
        <Box key={x} size={[0.08, height, 0.62]} position={[x, height / 2, z]} color={OAK} />
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, books.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      {ladder && <Ladder x={x0 + 1.3} z={z + 0.45} height={height} />}
    </group>
  );
}

/** A rolling library ladder leaning on the shelf. */
function Ladder({ x, z, height }: { x: number; z: number; height: number }) {
  const lean = 0.22;
  return (
    <group position={[x, 0, z + 0.35]} rotation={[-lean, 0, 0]}>
      {[-0.22, 0.22].map((dx) => (
        <Box key={dx} size={[0.05, height - 0.1, 0.05]} position={[dx, (height - 0.1) / 2, 0]} color={OAK_LIGHT} />
      ))}
      {Array.from({ length: 8 }, (_, i) => 0.3 + i * 0.36).map((y) => (
        <Box key={y} size={[0.4, 0.035, 0.035]} position={[0, y, 0]} color={OAK_LIGHT} />
      ))}
    </group>
  );
}

/** A green banker's lamp: brass base and stem, green shade, the bulb glows at night. */
function BankersLamp({ position, lamps, light = true }: { position: [number, number, number]; lamps: number; light?: boolean }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.04, 16]} />
        <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.34, 6]} />
        <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.36, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.42, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#1f6b4a" roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[0.36, 0.02, 0.1]} />
        <meshStandardMaterial color={CREAM_SOFT} />
      </mesh>
      {/* Always mounted so day/night only changes brightness: adding or removing lights recompiles every shader */}
      {light && <pointLight position={[0, 0.25, 0]} color="#ffd89a" intensity={lamps * 4} distance={4.5} decay={1.6} />}
    </group>
  );
}

function StudyTable({ t, lamps }: { t: StudyTableDef; lamps: number }) {
  const lampXs = t.lamps === 2 ? [-1.2, 1.2] : [0];
  return (
    <group position={[t.x, 0, t.z]}>
      <Box size={[t.width, 0.08, t.depth]} position={[0, 0.75, 0]} color={OAK_LIGHT} />
      <Box size={[t.width - 0.1, 0.06, t.depth - 0.1]} position={[0, 0.69, 0]} color={OAK} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            size={[0.09, 0.7, 0.09]}
            position={[sx * (t.width / 2 - 0.12), 0.35, sz * (t.depth / 2 - 0.12)]}
            color={WALNUT}
          />
        )),
      )}
      {lampXs.map((lx, i) => (
        // Long tables: two shades, one light between them (fewer lights keep every material cheap)
        <BankersLamp key={lx} position={[lx, 0.8, 0]} lamps={lamps} light={i === 0} />
      ))}
      {/* A small stack of books at one end */}
      <Box size={[0.22, 0.05, 0.3]} position={[t.width / 2 - 0.4, 0.815, -0.35]} color="#46527f" />
      <Box size={[0.2, 0.04, 0.28]} position={[t.width / 2 - 0.42, 0.86, -0.34]} color="#e0457b" />
    </group>
  );
}

/** Per-desk-seat props: chair, open laptop (screen is a share target later) and a notebook. */
export function SeatProps({ seats }: { seats: Seat[] }) {
  return (
    <>
      {seats.map((s) => {
        // Unit vector from the seat toward its table
        const fx = Math.sin(s.yaw);
        const fz = Math.cos(s.yaw);
        return (
          <group key={s.id}>
            <group position={[s.x - fx * CHAIR_BACK, 0, s.z - fz * CHAIR_BACK]} rotation={[0, s.yaw, 0]}>
              <Box size={[0.46, 0.06, 0.42]} position={[0, 0.44, 0]} color={OAK} />
              <Box size={[0.46, 0.5, 0.05]} position={[0, 0.72, -0.2]} color={WALNUT} />
              {[-1, 1].flatMap((sx) =>
                [-1, 1].map((sz) => (
                  <Box key={`${sx}${sz}`} size={[0.04, 0.44, 0.04]} position={[sx * 0.2, 0.22, sz * 0.18]} color={WALNUT} />
                )),
              )}
            </group>
            <group position={[s.x + fx * 0.42, 0.79, s.z + fz * 0.42]} rotation={[0, s.yaw + Math.PI, 0]}>
              <Box size={[0.36, 0.02, 0.24]} position={[0, 0, 0.02]} color="#c9ccd4" cast={false} />
              <group position={[0, 0.01, -0.1]} rotation={[-0.35, 0, 0]}>
                <Box size={[0.36, 0.22, 0.015]} position={[0, 0.11, 0]} color="#3a3d46" />
                {/* Plain colour (no glow, no name) so all the screens merge into one draw call */}
                <mesh position={[0, 0.11, 0.009]}>
                  <planeGeometry args={[0.33, 0.19]} />
                  <meshStandardMaterial color="#3b4a6b" />
                </mesh>
              </group>
            </group>
            <Box
              size={[0.18, 0.015, 0.24]}
              position={[s.x + fx * 0.4 + fz * 0.26, 0.795, s.z + fz * 0.4 - fx * 0.26]}
              color="#fdf6e3"
              cast={false}
            />
          </group>
        );
      })}
    </>
  );
}

/** A brass chandelier with candle bulbs (the bulbs are in Bulbs) over each half of the study block. */
function Chandelier({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 3.75, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.9, 6]} />
        <meshStandardMaterial color={IRON} />
      </mesh>
      <mesh position={[0, 3.3, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.55, 0.03, 8, 32]} />
        <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

// ---------- B. Window booth ----------

function Booth() {
  const b = BOOTH.bench;
  const cx = (b.minX + b.maxX) / 2;
  const w = b.maxX - b.minX;
  const cz = (b.minZ + b.maxZ) / 2;
  return (
    <group>
      <Box size={[w, 0.45, b.maxZ - b.minZ]} position={[cx, 0.225, cz]} color={OAK} />
      <Box size={[w, 0.6, 0.1]} position={[cx, 0.75, b.minZ - 0.0]} color={OAK} />
      {/* Seat cushions and a few loose ones */}
      <Box size={[w - 0.1, 0.1, b.maxZ - b.minZ - 0.1]} position={[cx, 0.5, cz]} color={LAVENDER} />
      {[9.1, 9.9, 11.1, 11.9].map((x, i) => (
        <Box
          key={x}
          size={[0.42, 0.42, 0.14]}
          position={[x, 0.78, b.minZ + 0.12]}
          rotation={[-0.15, 0, 0]}
          color={[PINK, BLUE, YELLOW, GREEN][i]!}
        />
      ))}
      <Box size={[BOOTH.table.w, 0.06, BOOTH.table.d]} position={[BOOTH.table.x, 0.42, BOOTH.table.z]} color={OAK_LIGHT} />
      <Cyl r={0.05} h={0.4} position={[BOOTH.table.x, 0.2, BOOTH.table.z]} color={WALNUT} />
      <Cyl r={0.22} h={0.03} position={[BOOTH.table.x, 0.02, BOOTH.table.z]} color={WALNUT} />
      {/* Teapot and two cups */}
      <Cyl r={0.09} h={0.12} position={[BOOTH.table.x - 0.2, 0.51, BOOTH.table.z]} color={CREAM_SOFT} segments={12} />
      {[0.15, 0.4].map((dx) => (
        <Cyl key={dx} r={0.04} h={0.06} position={[BOOTH.table.x + dx, 0.48, BOOTH.table.z + 0.1]} color={CREAM_SOFT} segments={10} />
      ))}
      <HangingLamp x={BOOTH.lamp.x} z={BOOTH.lamp.z} y={BOOTH.lamp.y} />
    </group>
  );
}

/** A pendant on a cord; the glow is a bulb in Bulbs. */
export function HangingLamp({ x, z, y }: { x: number; z: number; y: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, (WALL_H - y) / 2 + 0.1, 0]}>
        <cylinderGeometry args={[0.008, 0.008, WALL_H - y, 4]} />
        <meshStandardMaterial color={IRON} />
      </mesh>
      <mesh castShadow>
        <coneGeometry args={[0.26, 0.24, 20, 1, true]} />
        <meshStandardMaterial color="#e8d8c3" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ---------- C. Whiteboard corner ----------

function ChalkCart() {
  return (
    <group position={[CHALK_CART.x, 0, CHALK_CART.z]}>
      <Box size={[0.5, 0.05, 0.36]} position={[0, 0.62, 0]} color={OAK_LIGHT} />
      <Box size={[0.5, 0.05, 0.36]} position={[0, 0.3, 0]} color={OAK_LIGHT} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Cyl key={`${sx}${sz}`} r={0.015} h={0.64} position={[sx * 0.22, 0.32, sz * 0.15]} color={WALNUT} segments={6} />
        )),
      )}
      {[PINK, BLUE, YELLOW, GREEN].map((c, i) => (
        <Box key={c} size={[0.06, 0.1, 0.06]} position={[-0.15 + i * 0.1, 0.7, 0]} color={c} />
      ))}
    </group>
  );
}

// ---------- D. Fireside ----------

function Fireplace({ lamps }: { lamps: number }) {
  const h = FIRESIDE.hearth;
  return (
    <group position={[h.x, 0, h.z]}>
      {/* Stone surround, a dark firebox, a mantel and the chimney breast up to the ceiling */}
      <Box size={[h.depth, 1.3, h.width]} position={[0, 0.65, 0]} color={STONE} roughness={1} />
      <Box size={[0.5, 0.95, 1.3]} position={[0.14, 0.5, 0]} color="#2b2024" roughness={1} />
      <Box size={[h.depth + 0.25, 0.1, h.width + 0.3]} position={[0.05, 1.35, 0]} color={WALNUT} />
      <Box size={[0.5, WALL_H - 1.4, 2.0]} position={[-0.1, 1.4 + (WALL_H - 1.4) / 2, 0]} color={STONE} roughness={1} />
      {/* Hearth stone on the floor, logs, the fire */}
      <Box size={[0.9, 0.03, h.width]} position={[h.depth / 2 + 0.4, 0.015, 0]} color={STONE} />
      {[-0.22, 0.2].map((dz) => (
        <mesh key={dz} position={[0.22, 0.12, dz]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.5, 8]} />
          <meshStandardMaterial color={WALNUT} roughness={1} />
        </mesh>
      ))}
      <Fire lamps={lamps} />
      {/* On the mantel: a clock (WallClock sits above), two candlesticks and a small plant */}
      {[-0.7, 0.7].map((dz) => (
        <Cyl key={dz} r={0.03} h={0.3} position={[0.05, 1.55, dz]} color={BRASS} segments={8} />
      ))}
      <Cyl r={0.09} h={0.12} position={[0.05, 1.46, 0.35]} color="#d9805c" segments={10} />
      <mesh position={[0.05, 1.6, 0.35]} castShadow>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color="#5fa36a" flatShading />
      </mesh>
    </group>
  );
}

/** The fire: three flames that flicker, a warm light. Lit day and night (it is a library in the rain). */
const FLAMES = [
  { dz: 0, h: 0.3, r: 0.14, color: '#ff7a2a' },
  { dz: -0.12, h: 0.22, r: 0.1, color: '#ffb347' },
  { dz: 0.1, h: 0.2, r: 0.09, color: '#ffd166' },
];
/** Flickering flames and a warm light; the rooftop's fire pit uses it too. */
export function Fire({ lamps }: { lamps: number }) {
  const flames = useRef<THREE.InstancedMesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useLayoutEffect(() => {
    const c = new THREE.Color();
    FLAMES.forEach((f, i) => flames.current?.setColorAt(i, c.set(f.color)));
    if (flames.current?.instanceColor) flames.current.instanceColor.needsUpdate = true;
  }, []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mesh = flames.current;
    if (mesh) {
      FLAMES.forEach((f, i) => {
        // Unit cone scaled to each flame, flickering in height
        const k = 1 + Math.sin(t * (7 + i * 1.7) + i) * 0.12 + Math.sin(t * 13 + i * 2) * 0.06;
        m.makeScale(f.r, f.h * k, f.r);
        m.setPosition(0, (f.h * k) / 2, f.dz);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (light.current) light.current.intensity = (1.6 + lamps * 3) * (1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.04);
  });
  return (
    <group position={[0.2, 0.05, 0]}>
      <instancedMesh ref={flames} args={[undefined, undefined, FLAMES.length]}>
        <coneGeometry args={[1, 1, 8]} />
        <meshBasicMaterial transparent opacity={0.9} toneMapped={false} />
      </instancedMesh>
      <pointLight ref={light} position={[0.3, 0.4, 0]} color="#ff9a4a" intensity={3} distance={7} decay={1.7} />
    </group>
  );
}

function Armchair({ x, z, yaw, color }: { x: number; z: number; yaw: number; color: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <Box size={[0.82, 0.42, 0.78]} position={[0, 0.21, 0]} color={color} />
      <Box size={[0.82, 0.55, 0.16]} position={[0, 0.7, -0.31]} color={color} />
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.14, 0.26, 0.78]} position={[s * 0.34, 0.55, 0]} color={color} />
      ))}
      <Box size={[0.5, 0.08, 0.5]} position={[0, 0.46, 0.06]} color={CREAM_SOFT} />
    </group>
  );
}

function Fireside({ lamps }: { lamps: number }) {
  const ls = FIRESIDE.loveseat;
  return (
    <group>
      <Fireplace lamps={lamps} />
      {/* Loveseat facing the fire: seat, back on the room side, two arms */}
      <group position={[ls.x, 0, ls.z]}>
        <Box size={[0.75, 0.42, 1.5]} position={[0, 0.21, 0]} color="#c46a7a" />
        <Box size={[0.16, 0.55, 1.5]} position={[0.3, 0.7, 0]} color="#c46a7a" />
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.75, 0.26, 0.14]} position={[0, 0.55, s * 0.68]} color="#c46a7a" />
        ))}
        {[-0.35, 0.35].map((dz) => (
          <Box key={dz} size={[0.5, 0.08, 0.5]} position={[-0.05, 0.46, dz]} color={CREAM_SOFT} />
        ))}
      </group>
      {FIRESIDE.armchairs.map((c) => (
        <Armchair key={c.z} {...c} color="#8a5a6b" />
      ))}
      <Cyl r={FIRESIDE.sideTable.r} h={0.04} position={[FIRESIDE.sideTable.x, 0.5, FIRESIDE.sideTable.z]} color={OAK_LIGHT} segments={20} />
      <Cyl r={0.04} h={0.5} position={[FIRESIDE.sideTable.x, 0.25, FIRESIDE.sideTable.z]} color={WALNUT} segments={8} />
      <Cyl r={0.05} h={0.08} position={[FIRESIDE.sideTable.x + 0.08, 0.56, FIRESIDE.sideTable.z]} color={CREAM_SOFT} segments={10} />
      <FloorLamp x={FIRESIDE.lamp.x} z={FIRESIDE.lamp.z} lamps={lamps} />
      <ZoneSign zone={ZONES[0]!} x={FIRESIDE.zone.x + FIRESIDE.zone.w / 2 - 0.1} z={FIRESIDE.zone.z - FIRESIDE.zone.d / 2 + 0.2} />
    </group>
  );
}

export function FloorLamp({ x, z, lamps }: { x: number; z: number; lamps: number }) {
  return (
    <group position={[x, 0, z]}>
      <Cyl r={0.16} h={0.03} position={[0, 0.015, 0]} color={IRON} />
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.6, 6]} />
        <meshStandardMaterial color={IRON} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <coneGeometry args={[0.28, 0.32, 20, 1, true]} />
        <meshStandardMaterial color="#e8d8c3" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#ffd38a" intensity={lamps * 5} distance={6} decay={1.5} />
    </group>
  );
}

// ---------- E. TV lounge ----------

function Lounge({ lamps }: { lamps: number }) {
  const c = LOUNGE.console;
  const run = LOUNGE.sofaRun;
  const arm = LOUNGE.sofaArm;
  const mid = (a: number, b: number) => (a + b) / 2;
  const SOFA = '#6f80d6';
  const SOFA_DARK = '#5d6ec4';
  return (
    <group>
      {/* Low console under the TV, with two doors */}
      <Box size={[c.maxX - c.minX, 0.6, c.maxZ - c.minZ]} position={[mid(c.minX, c.maxX), 0.3, mid(c.minZ, c.maxZ)]} color={OAK} />
      {[-0.6, 0.6].map((dz) => (
        <Box key={dz} size={[0.02, 0.44, 1.0]} position={[c.maxX + 0.01, 0.32, mid(c.minZ, c.maxZ) + dz]} color={OAK_LIGHT} />
      ))}
      <BigScreen />
      {/* The L-shaped sofa: the long run faces the TV, the arm runs along the front */}
      <Box
        size={[run.maxX - run.minX, 0.42, run.maxZ - run.minZ]}
        position={[mid(run.minX, run.maxX), 0.21, mid(run.minZ, run.maxZ)]}
        color={SOFA}
      />
      <Box size={[0.18, 0.55, run.maxZ - run.minZ]} position={[run.maxX - 0.09, 0.7, mid(run.minZ, run.maxZ)]} color={SOFA} />
      <Box
        size={[arm.maxX - arm.minX, 0.42, arm.maxZ - arm.minZ]}
        position={[mid(arm.minX, arm.maxX), 0.21, mid(arm.minZ, arm.maxZ)]}
        color={SOFA}
      />
      <Box size={[arm.maxX - arm.minX, 0.55, 0.18]} position={[mid(arm.minX, arm.maxX), 0.7, arm.maxZ - 0.09]} color={SOFA} />
      <Box size={[0.16, 0.26, run.maxZ - run.minZ]} position={[run.minX + 0.08, 0.55, mid(run.minZ, run.maxZ) - 0.1]} color={SOFA} />
      <Box size={[0.16, 0.26, arm.maxZ - arm.minZ]} position={[arm.minX + 0.08, 0.55, mid(arm.minZ, arm.maxZ)]} color={SOFA} />
      {[4.5, 5.3, 6.1, 6.9].map((z) => (
        <Box key={z} size={[0.6, 0.1, 0.7]} position={[run.minX + 0.4, 0.47, z]} color={SOFA_DARK} />
      ))}
      {[-11.3, -10.4].map((x) => (
        <Box key={x} size={[0.7, 0.1, 0.6]} position={[x, 0.47, arm.minZ + 0.4]} color={SOFA_DARK} />
      ))}
      {/* Throw pillows in the corner */}
      <Box size={[0.4, 0.4, 0.14]} position={[-9.8, 0.75, 7.2]} rotation={[0, 0.5, 0.1]} color={PINK} />
      <Box size={[0.4, 0.4, 0.14]} position={[-10.0, 0.72, 7.55]} rotation={[0, 1.1, -0.1]} color={YELLOW} />
      {LOUNGE.beanbags.map((b, i) => (
        <mesh key={i} position={[b.x, 0.26, b.z]} scale={[1, 0.62, 1]} castShadow receiveShadow>
          <sphereGeometry args={[b.r, 18, 12]} />
          <meshStandardMaterial color={[PINK, BLUE][i]} roughness={1} />
        </mesh>
      ))}
      {LOUNGE.cushions.map((b, i) => (
        <Cyl key={i} r={b.r} h={0.14} position={[b.x, 0.07, b.z]} color={[YELLOW, GREEN][i]!} segments={20} />
      ))}
      <FloorLamp x={LOUNGE.lamp.x} z={LOUNGE.lamp.z} lamps={lamps} />
      {/* Coffee-table book and a mug on the console end */}
      <Box size={[0.26, 0.04, 0.34]} position={[c.maxX - 0.3, 0.62, c.minZ + 0.3]} color="#46527f" />
    </group>
  );
}

// ---------- Entrance ----------

function Entrance() {
  const tc = TEA_CART;
  return (
    <group>
      <Rug area={DOORMAT} color={OAK} border={WALNUT} />
      {/* Tea cart: two shelves, a kettle, cups and a cake stand */}
      <group position={[(tc.minX + tc.maxX) / 2, 0, (tc.minZ + tc.maxZ) / 2]}>
        <Box size={[tc.maxX - tc.minX, 0.05, tc.maxZ - tc.minZ]} position={[0, 0.82, 0]} color={OAK_LIGHT} />
        <Box size={[tc.maxX - tc.minX, 0.05, tc.maxZ - tc.minZ]} position={[0, 0.4, 0]} color={OAK_LIGHT} />
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <Cyl key={`${sx}${sz}`} r={0.02} h={0.84} position={[sx * 0.55, 0.42, sz * 0.3]} color={BRASS} segments={6} />
          )),
        )}
        <Cyl r={0.11} h={0.2} position={[-0.3, 0.95, 0]} color={CREAM_SOFT} segments={14} />
        {[0.05, 0.22, 0.39].map((dx) => (
          <Cyl key={dx} r={0.04} h={0.07} position={[dx, 0.88, 0.15]} color={CREAM_SOFT} segments={10} />
        ))}
        <Cyl r={0.14} h={0.02} position={[0.3, 0.97, -0.15]} color={CREAM_SOFT} segments={16} />
        <Cyl r={0.03} h={0.1} position={[0.3, 0.9, -0.15]} color={CREAM_SOFT} segments={8} />
        <Cyl r={0.09} h={0.08} position={[0.3, 1.02, -0.15]} color={PINK} segments={12} />
      </group>
      {/* Coat stand with a coat and a scarf, an umbrella bucket at its foot */}
      <group position={[COAT_STAND.x, 0, COAT_STAND.z]}>
        <Cyl r={0.18} h={0.04} position={[0, 0.02, 0]} color={WALNUT} />
        <Cyl r={0.025} h={1.8} position={[0, 0.9, 0]} color={WALNUT} segments={8} />
        {[0, 1, 2].map((i) => (
          <Box key={i} size={[0.3, 0.03, 0.03]} position={[0, 1.75, 0]} rotation={[0, (i * Math.PI * 2) / 3, 0]} color={WALNUT} />
        ))}
        <Box size={[0.3, 0.7, 0.14]} position={[0.14, 1.3, 0.1]} rotation={[0, 0.4, 0]} color={OAK} />
        <Cyl r={0.1} h={0.3} position={[0.26, 0.15, -0.2]} color="#46527f" segments={12} />
        <Cyl r={0.02} h={0.8} position={[0.26, 0.5, -0.2]} color="#e0457b" segments={6} />
      </group>
    </group>
  );
}

// ---------- H. Werewolf circle ----------

export function WerewolfCircle({ wolf: WOLF, seats, lamps }: { wolf: Werewolf; seats: Seat[]; lamps: number }) {
  return (
    <group>
      <Rug area={WOLF.area} color={RUG_GREEN} border={RUG_GREEN_EDGE} />
      <group position={[WOLF.x, 0, WOLF.z]}>
        <Cyl r={WOLF.tableR} h={0.06} position={[0, 0.34, 0]} color={OAK} segments={28} />
        <Cyl r={0.12} h={0.3} position={[0, 0.16, 0]} color={WALNUT} segments={12} />
        <Cyl r={0.3} h={0.03} position={[0, 0.015, 0]} color={WALNUT} segments={16} />
        {/* A brass lantern with a candle inside; its glow is a point light */}
        <Box size={[0.22, 0.3, 0.22]} position={[0, 0.53, 0]} color={BRASS} roughness={0.4} />
        <Cyl r={0.06} h={0.06} position={[0, 0.71, 0]} color={BRASS} segments={8} />
        <pointLight position={[0, 0.9, 0]} color="#ffb86b" intensity={1 + lamps * 3} distance={6} decay={1.6} />
      </group>
      {seats.map((s, i) => (
        <Cyl
          key={s.id}
          r={0.27}
          h={0.14}
          position={[s.x - Math.sin(s.yaw) * CHAIR_BACK, 0.07, s.z - Math.cos(s.yaw) * CHAIR_BACK]}
          color={i % 2 ? '#c9a070' : '#b5565f'}
          segments={18}
        />
      ))}
    </group>
  );
}

// ---------- Decor ----------

export function Plant({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.5, 12]} />
        <meshStandardMaterial color="#d9805c" />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.42, 10, 8]} />
        <meshStandardMaterial color="#5fa36a" flatShading />
      </mesh>
      <mesh position={[0.15, 1.25, -0.1]} castShadow>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshStandardMaterial color="#3f8a55" flatShading />
      </mesh>
    </group>
  );
}

export function CatTower({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box size={[0.7, 0.06, 0.7]} position={[0, 0.03, 0]} color="#d8c7b0" />
      <Cyl r={0.08} h={1.4} position={[-0.15, 0.7, -0.15]} color="#d8c7b0" segments={10} />
      <Cyl r={0.08} h={0.8} position={[0.2, 0.4, 0.18]} color="#d8c7b0" segments={10} />
      <Cyl r={0.24} h={0.05} position={[0.2, 0.82, 0.18]} color="#d8c7b0" segments={16} />
      <Cyl r={0.26} h={0.05} position={[-0.15, 1.42, -0.15]} color="#d8c7b0" segments={16} />
      <Box size={[0.4, 0.36, 0.4]} position={[0.1, 0.24, -0.05]} color={YELLOW} />
      <Box size={[0.26, 0.26, 0.02]} position={[0.1, 0.22, 0.16]} color="#2b2024" />
    </group>
  );
}

function Globe() {
  return (
    <group position={[GLOBE.x, 0, GLOBE.z]}>
      <Cyl r={0.2} h={0.04} position={[0, 0.02, 0]} color={WALNUT} />
      <Cyl r={0.03} h={0.7} position={[0, 0.37, 0]} color={WALNUT} segments={8} />
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 12]} />
        <meshStandardMaterial color={BLUE} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.0, 0]} rotation={[0, 0, 0.4]}>
        <torusGeometry args={[0.32, 0.015, 6, 24]} />
        <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** A framed print on a wall. `side` 'left' hangs on the left wall at z, 'back' on the back wall at x. */
export function Print({
  side,
  at,
  y,
  color,
  w = 0.7,
  h = 0.5,
}: {
  side: 'left' | 'back';
  at: number;
  y: number;
  color: string;
  w?: number;
  h?: number;
}) {
  const pos: [number, number, number] = side === 'left' ? [-W / 2 + 0.04, y, at] : [at, y, -D / 2 + 0.04];
  const rot: [number, number, number] = side === 'left' ? [0, Math.PI / 2, 0] : [0, 0, 0];
  return (
    <group position={pos} rotation={rot}>
      <Box size={[w + 0.1, h + 0.1, 0.04]} position={[0, 0, 0]} color={WALNUT} />
      <Box size={[w, h, 0.02]} position={[0, 0, 0.02]} color={color} />
    </group>
  );
}

function WallClock() {
  const hour = useRef<THREE.Group>(null);
  const minute = useRef<THREE.Group>(null);
  useFrame(() => {
    const now = new Date();
    const m = now.getMinutes() + now.getSeconds() / 60;
    const h = (now.getHours() % 12) + m / 60;
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2;
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2;
  });
  return (
    <group position={[-W / 2 + 0.44, 2.6, FIRESIDE.hearth.z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.05, 32]} />
        <meshStandardMaterial color="#6b4a33" />
      </mesh>
      <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.02, 32]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      <group position={[0, 0, 0.05]}>
        <group ref={hour}>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.03, 0.2, 0.01]} />
            <meshBasicMaterial color="#2b2430" />
          </mesh>
        </group>
        <group ref={minute}>
          <mesh position={[0, 0.14, 0.005]}>
            <boxGeometry args={[0.02, 0.28, 0.01]} />
            <meshBasicMaterial color="#2b2430" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** A small plaque hanging over a private zone's edge: "🔥 Fireside · private". */
export function ZoneSign({ zone, x, z }: { zone: Zone; x: number; z: number }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 144;
    const g = c.getContext('2d')!;
    g.fillStyle = '#3a2f38';
    g.beginPath();
    g.roundRect(4, 4, 504, 136, 28);
    g.fill();
    g.fillStyle = '#f6e9d8';
    g.font = '700 54px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(`${zone.emoji} ${zone.name}`, 256, 56);
    g.font = '600 30px system-ui, sans-serif';
    g.fillStyle = '#c9b8e3';
    g.fillText('private · only people here hear you', 256, 108);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [zone]);
  const y = 2.35;
  return (
    <group position={[x, y, z]} rotation={[0, Math.PI / 4, 0]}>
      {[-0.5, 0.5].map((dx) => (
        <mesh key={dx} position={[dx, (WALL_H - y) / 2 + 0.17, 0]}>
          <cylinderGeometry args={[0.006, 0.006, WALL_H - y - 0.1, 4]} />
          <meshStandardMaterial color={IRON} />
        </mesh>
      ))}
      <mesh userData={{ dynamic: true }}>
        <planeGeometry args={[1.5, 0.42]} />
        <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Every small glowing thing in one draw call: chandelier candles, string lights over the lounge,
 * paper lanterns over the games side, the pendant bulbs. Pale by day, warm at night.
 */
export interface Bulb {
  x: number;
  y: number;
  z: number;
  s: number;
  color: string;
}
export function Bulbs({ bulbs, lamps }: { bulbs: Bulb[]; lamps: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const pale = new THREE.Color('#f3ead0');
    bulbs.forEach((b, i) => {
      m.makeScale(b.s, b.s, b.s);
      m.setPosition(b.x, b.y, b.z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(b.color).lerp(pale, (1 - lamps) * 0.6));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bulbs, lamps]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bulbs.length]}>
      <sphereGeometry args={[0.06, 10, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function LibraryBulbs({ lamps }: { lamps: number }) {
  const bulbs = useMemo<Bulb[]>(() => {
    const list: Bulb[] = [];
    for (const [cx, cz] of [
      [STUDY_RUGS[0]!.x, STUDY_RUGS[0]!.z],
      [STUDY_RUGS[1]!.x, STUDY_RUGS[1]!.z],
    ])
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        list.push({ x: cx + Math.cos(a) * 0.55, y: 3.42, z: cz + Math.sin(a) * 0.55, s: 1, color: '#fff1b0' });
      }
    // String lights: a sagging line across the lounge
    for (let i = 0; i <= 14; i++) {
      const k = i / 14;
      list.push({ x: -12.7 + k * 4.4, y: 3.5 - Math.sin(k * Math.PI) * 0.5, z: 3.8 + k * 4.5, s: 0.9, color: '#ffe8a8' });
    }
    // Paper lanterns over the Werewolf circle and the card tables
    for (const [x, y, z, c] of [
      [8.4, 3.0, 4.4, '#ffb3c4'],
      [10.8, 3.3, 6.5, '#ffd9a0'],
      [9.6, 2.8, 7.7, '#c9e4ff'],
    ] as const)
      list.push({ x, y, z, s: 3.6, color: c });
    for (const t of CARD_TABLES) list.push({ x: t.x, y: 1.7, z: t.z, s: 1.2, color: '#fff1b0' });
    list.push({ x: BOOTH.lamp.x, y: BOOTH.lamp.y - 0.08, z: BOOTH.lamp.z, s: 1.2, color: '#fff1b0' });
    for (const l of [FIRESIDE.lamp, LOUNGE.lamp]) list.push({ x: l.x, y: 1.58, z: l.z, s: 1.6, color: '#fff1b0' });
    list.push({ x: WOLF.x, y: 0.72, z: WOLF.z, s: 2.4, color: '#ffd27a' });
    return list;
  }, []);
  return <Bulbs bulbs={bulbs} lamps={lamps} />;
}

export function Library({ light, shadows = true }: { light: DayLight; shadows?: boolean }) {
  const lamps = light.lamps;
  return (
    <group>
      <hemisphereLight args={[light.hemiSky, '#cbb89d', light.hemiIntensity]} />
      <directionalLight
        position={light.sunPosition}
        intensity={light.sunIntensity}
        color={light.sunColor}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-radius={3}
      />

      {/* Furniture never moves: merge it into a few meshes (see StaticBatch) */}
      <StaticBatch>
        <Shell windowColor={light.windowColor} />

        {/* Rugs: every activity and private zone is one (the rug is the area) */}
        {STUDY_RUGS.map((r, i) => (
          <Rug key={i} area={r} color={RUG_RED} border={RUG_RED_EDGE} />
        ))}
        <Rug area={BOOTH.zone} color={LAVENDER} border={RUG_LAVENDER_EDGE} />
        <Rug area={BOARD_AREA} color="#dfd3bf" border={TRIM} />
        <Rug area={FIRESIDE.zone} color={RUG_RED} border={RUG_RED_EDGE} />
        <Rug area={LOUNGE.area} color={LAVENDER} border={RUG_LAVENDER_EDGE} />
        <FourColourRug area={FLOOR_AREA} />
        {CARD_TABLES.map((t) => (
          <Rug key={t.id} area={t.area} color={RUG_GREEN} border={RUG_GREEN_EDGE} />
        ))}
        <Rug area={ART_AREA} color={RUG_CREAM} border={RUG_CREAM_EDGE} />

        {SHELVES.map((s) => (
          <Bookshelf key={s.x0} {...s} />
        ))}
        {STUDY_TABLES.map((t) => (
          <StudyTable key={t.id} t={t} lamps={lamps} />
        ))}
        <SeatProps seats={DESK_SEATS} />
        {STUDY_RUGS.map((r, i) => (
          <Chandelier key={i} x={r.x} z={r.z} />
        ))}
        <Globe />

        <Booth />
        <WhiteboardFrame />
        <ChalkCart />
        <Fireside lamps={lamps} />
        <WallClock />
        <Lounge lamps={lamps} />
        <Entrance />
        <CardTables />
        <WerewolfCircle wolf={WOLF} seats={WOLF_SEATS} lamps={lamps} />
        <ZoneSign zone={ZONES[1]!} x={BOOTH.zone.x - BOOTH.zone.w / 2 + 0.3} z={BOOTH.zone.z + BOOTH.zone.d / 2 - 0.1} />
        <ArtCorner area={ART_AREA} easels={EASELS} cart={PAINT_CART} gallery={GALLERY} />
        <CatTower x={CAT_TOWER.x} z={CAT_TOWER.z} />

        <Print side="left" at={-3.4} y={2.5} color={GREEN} />
        <Print side="left" at={-2.4} y={2.3} color={BLUE} w={0.5} h={0.6} />
        <Print side="left" at={3.1} y={2.5} color={YELLOW} />
        <Print side="back" at={-6.1} y={3.75} color={PINK} w={0.6} h={0.4} />
        <Print side="back" at={7.6} y={3.75} color={LAVENDER} w={0.6} h={0.4} />

        {PLANTS.map((p) => (
          <Plant key={`${p.x},${p.z}`} {...p} />
        ))}
        <LibraryBulbs lamps={lamps} />
      </StaticBatch>
    </group>
  );
}
