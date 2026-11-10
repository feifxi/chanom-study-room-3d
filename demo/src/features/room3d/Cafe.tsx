'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { Seat } from '@study/shared';
import type { DayLight } from './dayCycle';
import { CHAIR_BACK } from './Avatar';
import { StaticBatch } from './StaticBatch';
import {
  BLUE,
  BRASS,
  Box,
  Bulbs,
  CatTower,
  CREAM_SOFT,
  Cyl,
  FloorLamp,
  FourColourRug,
  GREEN,
  HangingLamp,
  IRON,
  OAK,
  OAK_LIGHT,
  PINK,
  Plant,
  Print,
  RUG_CREAM,
  RUG_CREAM_EDGE,
  RUG_GREEN,
  RUG_GREEN_EDGE,
  Rug,
  WALNUT,
  WerewolfCircle,
  YELLOW,
  ZoneSign,
  type Bulb,
} from './Library';
import { BigScreen, CardTables } from '../activities/Activity3D';
import { WhiteboardFrame } from '../activities/board/Board3D';
import { ArtCorner } from '../activities/telephone/ArtCorner3D';
import {
  ART_AREA,
  A_BOARD,
  BACK_BAR,
  BAR,
  BOARD_AREA,
  BOOTHS,
  CARD_TABLES,
  CAT_BEDS,
  CAT_WHEEL,
  COFFEE_MACHINE,
  DESK_SEATS,
  DOOR,
  DOORMAT,
  EASELS,
  FLOOR_AREA,
  FRONT_WINDOWS,
  LOUNGE,
  PAINT_CART,
  PASTRY_CASE,
  PHOTO_WALL,
  PLANTS,
  ROOM,
  TABLES,
  TABLES_RUG,
  TILE_STRIP,
  TILL,
  UMBRELLA_STAND,
  WINDOW_BAR,
  WOLF,
  WOLF_SEATS,
  type CafeTable,
} from '../map/cafe';

/**
 * The Cat Café's look (layout in `features/map/cafe.ts`). Warm cream and peach walls, honey wood,
 * terracotta and mint, cream-and-mint tiles behind the bar, Edison bulbs over the counter, bunting
 * across the room and a cat on every other chair. Same batching rules as the library.
 */

const W = ROOM.width;
const D = ROOM.depth;
const WALL_H = 4.2;

const WALL = '#f6efe3';
const PEACH = '#f2c4ad';
const TERRACOTTA = '#c96f4e';
const TERRACOTTA_DARK = '#a8563a';
const MINT = '#9fd1bd';
const HONEY = '#d4a373';
const TILE_A = '#efe6d6';
const TILE_B = '#bfe0d2';
const CHALK = '#2f3a36';
const LEATHER = '#b5564a';
const FLOOR_COLORS = ['#e8b4a3', '#a9d4c3', '#efd9a0', '#e3b6c2'];

// ---------- Shell ----------

function Shell({ windowColor }: { windowColor: string }) {
  const planks = useMemo(() => Array.from({ length: Math.floor(D / 0.9) }, (_, i) => -D / 2 + 0.9 * (i + 1)), []);
  const tiles = useMemo(() => {
    const list: { x: number; z: number; dark: boolean }[] = [];
    const size = 0.8;
    for (let x = -W / 2 + size / 2; x < W / 2; x += size)
      for (let z = TILE_STRIP.minZ + size / 2; z < TILE_STRIP.maxZ; z += size)
        list.push({ x, z, dark: (Math.round(x / size) + Math.round(z / size)) % 2 === 0 });
    return list;
  }, []);
  return (
    <group>
      <Box size={[W, 0.4, D]} position={[0, -0.2, 0]} color={HONEY} cast={false} />
      {planks.map((z) => (
        <Box key={z} size={[W, 0.006, 0.025]} position={[0, 0.002, z]} color="#c18f62" cast={false} />
      ))}
      {/* Checkerboard tiles behind the bar */}
      {tiles.map((t, i) => (
        <mesh key={i} position={[t.x, 0.006, t.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.78, 0.78]} />
          <meshStandardMaterial color={t.dark ? TILE_B : TILE_A} roughness={1} />
        </mesh>
      ))}
      <Box size={[W + 0.4, WALL_H, 0.2]} position={[0, WALL_H / 2, -D / 2 - 0.1]} color={WALL} />
      <Box size={[0.2, WALL_H, D]} position={[-W / 2 - 0.1, WALL_H / 2, 0]} color={WALL} />
      {/* Peach wainscot and a picture rail */}
      <Box size={[W, 1.1, 0.03]} position={[0, 0.55, -D / 2 + 0.015]} color={PEACH} cast={false} />
      <Box size={[0.03, 1.1, D]} position={[-W / 2 + 0.015, 0.55, 0]} color={PEACH} cast={false} />
      <Box size={[W, 0.06, 0.05]} position={[0, 1.12, -D / 2 + 0.03]} color={OAK_LIGHT} cast={false} />
      <Box size={[0.05, 0.06, D]} position={[-W / 2 + 0.03, 1.12, 0]} color={OAK_LIGHT} cast={false} />
      {FRONT_WINDOWS.map((w) => (
        <FrontWindow key={w.z0} z0={w.z0} z1={w.z1} color={windowColor} />
      ))}
      <FrontDoor color={windowColor} />
      <PhotoWall />
    </group>
  );
}

/** A tall shop window on the left wall, with hanging plants in front of it. */
function FrontWindow({ z0, z1, color }: { z0: number; z1: number; color: string }) {
  const cz = (z0 + z1) / 2;
  const w = z1 - z0;
  return (
    <group position={[-W / 2 + 0.02, 2.2, cz]} rotation={[0, Math.PI / 2, 0]}>
      <Box size={[w + 0.24, 2.8, 0.1]} position={[0, 0, 0]} color={WALL} cast={false} />
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[w, 2.56]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {Array.from({ length: Math.round(w / 1.6) - 1 }, (_, i) => -w / 2 + (i + 1) * (w / Math.round(w / 1.6))).map((x) => (
        <Box key={x} size={[0.08, 2.56, 0.04]} position={[x, 0, 0.09]} color={WALL} cast={false} />
      ))}
      <Box size={[w, 0.06, 0.04]} position={[0, 0.5, 0.09]} color={WALL} cast={false} />
      <Box size={[w + 0.4, 0.08, 0.3]} position={[0, -1.46, 0.14]} color={WALL} cast={false} />
      {/* Hanging plants along the top */}
      {[-0.3, 0.3].map((k) => (
        <group key={k} position={[k * w, 0.9, 0.35]}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.9, 4]} />
            <meshStandardMaterial color={IRON} />
          </mesh>
          <Cyl r={0.14} h={0.16} position={[0, -0.05, 0]} color={TERRACOTTA} segments={12} />
          <mesh position={[0, -0.1, 0]} castShadow>
            <sphereGeometry args={[0.3, 10, 8]} />
            <meshStandardMaterial color="#5fa36a" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The shop door in the glass front: a wooden frame, a glass pane, a bell above and an OPEN sign. */
function FrontDoor({ color }: { color: string }) {
  return (
    <group position={[-W / 2 + 0.02, 0, DOOR.z]} rotation={[0, Math.PI / 2, 0]}>
      <Box size={[DOOR.width + 0.3, 2.5, 0.14]} position={[0, 1.25, 0]} color={OAK} />
      <Box size={[DOOR.width, 2.2, 0.06]} position={[0, 1.12, 0.06]} color={TERRACOTTA_DARK} />
      <mesh position={[0, 1.45, 0.1]}>
        <planeGeometry args={[DOOR.width - 0.3, 1.1]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Cyl r={0.03} h={0.2} position={[0.45, 1.05, 0.12]} color={BRASS} segments={8} />
      <mesh position={[0.5, 2.3, 0.14]} castShadow>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
      </mesh>
      <Box size={[0.5, 0.22, 0.02]} position={[0, 1.85, 0.11]} color={MINT} cast={false} />
    </group>
  );
}

/** Framed cat photos on the back wall above the art corner: the gallery for Draw & Guess reveals. */
function PhotoWall() {
  const frames = [
    [-1.4, 0.3, 0.5, 0.4, PINK],
    [-0.7, -0.1, 0.4, 0.5, BLUE],
    [0, 0.35, 0.7, 0.5, YELLOW],
    [0.7, -0.15, 0.4, 0.4, MINT],
    [1.4, 0.25, 0.5, 0.6, PINK],
  ] as const;
  return (
    <group position={[PHOTO_WALL.x, PHOTO_WALL.y, -D / 2 + 0.04]}>
      {frames.map(([dx, dy, w, h, c], i) => (
        <group key={i} position={[dx, dy, 0]}>
          <Box size={[w + 0.08, h + 0.08, 0.04]} position={[0, 0, 0]} color={WALNUT} />
          <Box size={[w, h, 0.02]} position={[0, 0, 0.02]} color={c} />
        </group>
      ))}
    </group>
  );
}

// ---------- A. The bar ----------

/** Edison bulbs over the counter, evenly spaced. */
const EDISONS = [-2, -1, 0, 1, 2].map((i) => (BAR.minX + BAR.maxX) / 2 + i * 2.2);

function Bar() {
  const cx = (BAR.minX + BAR.maxX) / 2;
  const w = BAR.maxX - BAR.minX;
  const d = BAR.maxZ - BAR.minZ;
  const cz = (BAR.minZ + BAR.maxZ) / 2;
  const cups = useMemo(() => {
    const list: { x: number; y: number; color: string }[] = [];
    const colors = [PINK, BLUE, YELLOW, GREEN, CREAM_SOFT];
    for (const y of [1.75, 2.25])
      for (let x = BAR.minX + 0.6; x < BAR.maxX - 0.3; x += 0.46)
        list.push({ x, y, color: colors[Math.abs(Math.round(x * 10)) % colors.length]! });
    return list;
  }, []);
  return (
    <group>
      {/* Counter: tiled front, wood top, a brass foot rail */}
      <Box size={[w, 0.9, d]} position={[cx, 0.45, cz]} color={TERRACOTTA} />
      <Box size={[w + 0.1, 0.07, d + 0.1]} position={[cx, BAR.top - 0.035, cz]} color={OAK_LIGHT} />
      <Box size={[w - 0.3, 0.04, 0.03]} position={[cx, 0.52, BAR.maxZ + 0.015]} color={TERRACOTTA_DARK} />
      <mesh position={[cx, 0.2, BAR.maxZ + 0.18]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, w - 0.4, 8]} />
        <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Back bar: a lower cabinet, two shelves of cups and syrups, the chalk menu above */}
      <Box size={[BACK_BAR.maxX - BACK_BAR.minX, 1.0, 0.6]} position={[cx, 0.5, -D / 2 + 0.3]} color={OAK} />
      <Box size={[BACK_BAR.maxX - BACK_BAR.minX, 0.06, 0.6]} position={[cx, 1.03, -D / 2 + 0.3]} color={OAK_LIGHT} />
      {[1.7, 2.2].map((y) => (
        <Box key={y} size={[w, 0.05, 0.3]} position={[cx, y, -D / 2 + 0.18]} color={OAK_LIGHT} />
      ))}
      {cups.map((c, i) => (
        <Cyl key={i} r={0.07} h={0.1} position={[c.x, c.y + 0.08, -D / 2 + 0.2]} color={c.color} segments={10} />
      ))}
      {[-6.2, -3.9, -1.6, 0.6, 2.8].map((x, i) => (
        <Cyl
          key={x}
          r={0.05}
          h={0.34}
          position={[x, 2.42, -D / 2 + 0.2]}
          color={[TERRACOTTA, YELLOW, PINK, GREEN, BLUE][i]!}
          segments={8}
        />
      ))}
      <Box size={[3.4, 1.1, 0.05]} position={[cx, 3.1, -D / 2 + 0.03]} color={CHALK} cast={false} />
      <Box size={[3.5, 1.2, 0.03]} position={[cx, 3.1, -D / 2 + 0.02]} color={OAK} cast={false} />
      {[0.3, 0.1, -0.1, -0.3].map((dy, i) => (
        <Box
          key={dy}
          size={[i === 0 ? 1.4 : 2.4 - (i % 2) * 0.5, 0.05, 0.01]}
          position={[cx + (i === 0 ? 0 : -0.3), 3.1 + dy, -D / 2 + 0.06]}
          color={CREAM_SOFT}
          cast={false}
        />
      ))}
      {/* Coffee machine, grinder, till, a sign */}
      <group position={[COFFEE_MACHINE.x, BAR.top, COFFEE_MACHINE.z]}>
        <Box size={[0.7, 0.5, 0.5]} position={[0, 0.25, 0]} color="#dfe6ee" roughness={0.3} />
        <Box size={[0.6, 0.08, 0.3]} position={[0, 0.54, 0]} color={IRON} />
        <Cyl r={0.04} h={0.12} position={[-0.2, 0.1, 0.3]} color={IRON} segments={8} />
        <Cyl r={0.04} h={0.12} position={[0.1, 0.1, 0.3]} color={IRON} segments={8} />
        <Cyl r={0.06} h={0.3} position={[0.6, 0.15, -0.05]} color={IRON} segments={10} />
      </group>
      <group position={[TILL.x, BAR.top, TILL.z]}>
        <Box size={[0.42, 0.22, 0.4]} position={[0, 0.11, 0]} color="#dfe6ee" roughness={0.3} />
        <Box size={[0.36, 0.26, 0.03]} position={[0, 0.36, -0.1]} rotation={[-0.3, 0, 0]} color={IRON} />
        <Cyl r={0.11} h={0.03} position={[0.5, 0.015, 0.1]} color={YELLOW} segments={12} />
      </group>
      {/* Pastry case: a glass box with cakes on two shelves */}
      <group position={[PASTRY_CASE.x, BAR.top, PASTRY_CASE.z]}>
        <Box size={[PASTRY_CASE.w, 0.04, PASTRY_CASE.d]} position={[0, 0.02, 0]} color={OAK_LIGHT} />
        <Box size={[PASTRY_CASE.w - 0.1, 0.03, PASTRY_CASE.d - 0.1]} position={[0, 0.3, 0]} color={OAK_LIGHT} />
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[PASTRY_CASE.w, 0.56, PASTRY_CASE.d]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.22} roughness={0.05} depthWrite={false} />
        </mesh>
        {[
          [-0.5, 0.1, PINK],
          [-0.1, 0.1, YELLOW],
          [0.35, 0.1, TERRACOTTA],
          [-0.4, 0.38, GREEN],
          [0.1, 0.38, CREAM_SOFT],
          [0.5, 0.38, PINK],
        ].map(([x, y, c], i) => (
          <Cyl key={i} r={0.1} h={0.1} position={[x as number, (y as number) + 0.03, 0]} color={c as string} segments={12} />
        ))}
      </group>
      {/* Edison pendants over the counter (the bulbs glow in Bulbs) */}
      {EDISONS.map((x) => (
        <mesh key={x} position={[x, 3.2, cz]}>
          <cylinderGeometry args={[0.006, 0.006, 2.0, 4]} />
          <meshStandardMaterial color={IRON} />
        </mesh>
      ))}
      <pointLight position={[cx - 2.6, 2.0, cz]} color="#ffcf8a" intensity={2.4} distance={7} decay={1.6} />
      <pointLight position={[cx + 2.6, 2.0, cz]} color="#ffcf8a" intensity={2.4} distance={7} decay={1.6} />
    </group>
  );
}

/** The window bar along the glass front, with a cat asleep on it (a nap spot). */
function WindowBar() {
  const w = WINDOW_BAR.maxX - WINDOW_BAR.minX;
  const d = WINDOW_BAR.maxZ - WINDOW_BAR.minZ;
  const cz = (WINDOW_BAR.minZ + WINDOW_BAR.maxZ) / 2;
  return (
    <group position={[(WINDOW_BAR.minX + WINDOW_BAR.maxX) / 2, 0, cz]}>
      <Box size={[w, 0.06, d]} position={[0, WINDOW_BAR.top - 0.03, 0]} color={OAK_LIGHT} />
      {[-d / 2 + 0.3, 0, d / 2 - 0.3].map((z) => (
        <Box key={z} size={[0.06, WINDOW_BAR.top - 0.06, 0.06]} position={[w / 2 - 0.08, (WINDOW_BAR.top - 0.06) / 2, z]} color={WALNUT} />
      ))}
      <Cyl r={0.1} h={0.12} position={[0, WINDOW_BAR.top + 0.06, d / 2 - 0.3]} color={TERRACOTTA} segments={10} />
      <mesh position={[0, WINDOW_BAR.top + 0.25, d / 2 - 0.3]} castShadow>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color="#5fa36a" flatShading />
      </mesh>
    </group>
  );
}

// ---------- Seats and tables ----------

/** A café stool (bar and window bar) or a bentwood chair (tables), plus the laptop and notebook. */
function CafeSeats({ seats }: { seats: Seat[] }) {
  return (
    <>
      {seats.map((s) => {
        const fx = Math.sin(s.yaw);
        const fz = Math.cos(s.yaw);
        const stool = s.tableId === 'bar' || s.tableId === 'window';
        const high = stool ? 0.22 : 0;
        return (
          <group key={s.id}>
            <group position={[s.x - fx * CHAIR_BACK, 0, s.z - fz * CHAIR_BACK]} rotation={[0, s.yaw, 0]}>
              {stool ? (
                <>
                  <Cyl r={0.21} h={0.07} position={[0, 0.64, 0]} color={LEATHER} segments={18} />
                  <Cyl r={0.035} h={0.6} position={[0, 0.3, 0]} color={IRON} segments={8} />
                  <Cyl r={0.18} h={0.03} position={[0, 0.015, 0]} color={IRON} segments={14} />
                  <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.16, 0.012, 6, 18]} />
                    <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
                  </mesh>
                </>
              ) : (
                <>
                  <Cyl r={0.22} h={0.05} position={[0, 0.44, 0]} color={OAK_LIGHT} segments={18} />
                  <mesh position={[0, 0.78, -0.19]} rotation={[0.1, 0, 0]} castShadow>
                    <torusGeometry args={[0.17, 0.02, 6, 20, Math.PI]} />
                    <meshStandardMaterial color={OAK_LIGHT} roughness={0.85} />
                  </mesh>
                  {[-1, 1].map((sx) => (
                    <Box key={sx} size={[0.03, 0.4, 0.03]} position={[sx * 0.15, 0.6, -0.19]} color={OAK_LIGHT} />
                  ))}
                  {[-1, 1].flatMap((sx) =>
                    [-1, 1].map((sz) => (
                      <Box key={`${sx}${sz}`} size={[0.03, 0.44, 0.03]} position={[sx * 0.16, 0.22, sz * 0.15]} color={OAK_LIGHT} />
                    )),
                  )}
                </>
              )}
            </group>
            {/* Laptop and notebook on the table or bar in front of the seat */}
            <group position={[s.x + fx * 0.42, 0.79 + high, s.z + fz * 0.42]} rotation={[0, s.yaw + Math.PI, 0]}>
              <Box size={[0.36, 0.02, 0.24]} position={[0, 0, 0.02]} color="#c9ccd4" cast={false} />
              <group position={[0, 0.01, -0.1]} rotation={[-0.35, 0, 0]}>
                <Box size={[0.36, 0.22, 0.015]} position={[0, 0.11, 0]} color="#3a3d46" />
                <mesh position={[0, 0.11, 0.009]}>
                  <planeGeometry args={[0.33, 0.19]} />
                  <meshStandardMaterial color="#3b4a6b" />
                </mesh>
              </group>
            </group>
            <Cyl
              r={0.045}
              h={0.08}
              position={[s.x + fx * 0.4 + fz * 0.26, 0.83 + high, s.z + fz * 0.4 - fx * 0.26]}
              color={CREAM_SOFT}
              segments={10}
            />
          </group>
        );
      })}
    </>
  );
}

function CafeTableMesh({ t }: { t: CafeTable }) {
  return (
    <group position={[t.x, 0, t.z]}>
      {t.kind === 'long' && (
        <>
          <Box size={[t.size, 0.07, 1.2]} position={[0, 0.755, 0]} color={OAK_LIGHT} />
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <Box key={`${sx}${sz}`} size={[0.09, 0.72, 0.09]} position={[sx * (t.size / 2 - 0.15), 0.36, sz * 0.45]} color={WALNUT} />
            )),
          )}
          {[-1.0, 1.0].map((x) => (
            <Vase key={x} x={x} />
          ))}
          <mesh position={[0, 3.0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 2.2, 4]} />
            <meshStandardMaterial color={IRON} />
          </mesh>
          <mesh position={[0, 1.9, 0]} castShadow>
            <coneGeometry args={[0.34, 0.26, 20, 1, true]} />
            <meshStandardMaterial color={TERRACOTTA} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          <pointLight position={[0, 1.7, 0]} color="#ffcf8a" intensity={2} distance={5} decay={1.6} />
        </>
      )}
      {t.kind === 'square' && (
        <>
          <Box size={[t.size, 0.06, t.size]} position={[0, 0.76, 0]} color={OAK_LIGHT} />
          <Cyl r={0.06} h={0.72} position={[0, 0.36, 0]} color={WALNUT} segments={10} />
          <Cyl r={0.32} h={0.03} position={[0, 0.015, 0]} color={WALNUT} segments={16} />
          <Vase x={0} />
        </>
      )}
      {t.kind === 'round' && (
        <>
          <Cyl r={t.size / 2} h={0.05} position={[0, 0.765, 0]} color={OAK_LIGHT} segments={24} />
          <Cyl r={0.04} h={0.74} position={[0, 0.37, 0]} color={IRON} segments={8} />
          <Cyl r={0.26} h={0.03} position={[0, 0.015, 0]} color={IRON} segments={16} />
          <Vase x={0} />
        </>
      )}
    </group>
  );
}

/** A little vase with one flower, the café's table dressing. */
function Vase({ x }: { x: number }) {
  return (
    <group position={[x, 0.79, 0]}>
      <Cyl r={0.04} h={0.14} position={[0, 0.07, 0]} color={MINT} segments={10} />
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.12, 4]} />
        <meshStandardMaterial color="#5fa36a" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshStandardMaterial color={PINK} />
      </mesh>
    </group>
  );
}

// ---------- B. Booths ----------

function Booths() {
  return (
    <>
      {BOOTHS.map((b) => (
        <group key={b.id}>
          <Rug area={b.zone.area} color={RUG_CREAM} border={RUG_CREAM_EDGE} />
          {b.benches.map((bench, i) => {
            const cz = (bench.minZ + bench.maxZ) / 2;
            const back = bench.yaw === 0 ? bench.minZ - 0.08 : bench.maxZ + 0.08;
            return (
              <group key={i}>
                <Box size={[b.x1 - b.x0, 0.45, bench.maxZ - bench.minZ]} position={[(b.x0 + b.x1) / 2, 0.225, cz]} color={LEATHER} />
                <Box size={[b.x1 - b.x0, 1.1, 0.16]} position={[(b.x0 + b.x1) / 2, 0.55, back]} color={LEATHER} />
                <Box
                  size={[b.x1 - b.x0 - 0.1, 0.1, bench.maxZ - bench.minZ - 0.1]}
                  position={[(b.x0 + b.x1) / 2, 0.5, cz]}
                  color={TERRACOTTA_DARK}
                />
                {[9.7, 11.5].map((x, k) => (
                  <Box
                    key={x}
                    size={[0.38, 0.38, 0.12]}
                    position={[x, 0.78, back + (bench.yaw === 0 ? 0.14 : -0.14)]}
                    color={k ? PINK : YELLOW}
                  />
                ))}
              </group>
            );
          })}
          <Box size={[b.table.w, 0.06, b.table.d]} position={[b.table.x, 0.75, b.table.z]} color={OAK_LIGHT} />
          <Cyl r={0.05} h={0.72} position={[b.table.x, 0.36, b.table.z]} color={IRON} segments={8} />
          <Cyl r={0.28} h={0.03} position={[b.table.x, 0.015, b.table.z]} color={IRON} segments={14} />
          <Cyl r={0.045} h={0.07} position={[b.table.x - 0.4, 0.815, b.table.z + 0.1]} color={CREAM_SOFT} segments={10} />
          <Cyl r={0.045} h={0.07} position={[b.table.x + 0.4, 0.815, b.table.z - 0.1]} color={CREAM_SOFT} segments={10} />
          <HangingLamp x={b.table.x} z={b.table.z} y={2.3} />
          <ZoneSign zone={b.zone} x={b.x0 - 0.1} z={b.zone.area.z} />
        </group>
      ))}
    </>
  );
}

// ---------- E. TV lounge ----------

function Lounge({ lamps }: { lamps: number }) {
  const sh = LOUNGE.shelf;
  return (
    <group>
      <Rug area={LOUNGE.area} color={PEACH} border={TERRACOTTA} />
      <BigScreen />
      {/* A low shelf under the TV with a plant and a stack of magazines */}
      <Box
        size={[sh.maxX - sh.minX, 0.32, sh.maxZ - sh.minZ]}
        position={[(sh.minX + sh.maxX) / 2, 0.16, (sh.minZ + sh.maxZ) / 2]}
        color={OAK}
      />
      <Cyl r={0.1} h={0.14} position={[sh.minX + 0.3, 0.39, (sh.minZ + sh.maxZ) / 2]} color={TERRACOTTA} segments={10} />
      <mesh position={[sh.minX + 0.3, 0.58, (sh.minZ + sh.maxZ) / 2]} castShadow>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshStandardMaterial color="#5fa36a" flatShading />
      </mesh>
      <Box size={[0.34, 0.06, 0.26]} position={[sh.maxX - 0.4, 0.35, (sh.minZ + sh.maxZ) / 2]} color={BLUE} />
      {LOUNGE.beanbags.map((b, i) => (
        <mesh key={i} position={[b.x, 0.26, b.z]} scale={[1, 0.62, 1]} castShadow receiveShadow>
          <sphereGeometry args={[b.r, 18, 12]} />
          <meshStandardMaterial color={[MINT, PINK, YELLOW, BLUE][i]} roughness={1} />
        </mesh>
      ))}
      {LOUNGE.cushions.map((b, i) => (
        <Cyl key={i} r={b.r} h={0.14} position={[b.x, 0.07, b.z]} color={[GREEN, PINK][i]!} segments={20} />
      ))}
      <CatTower x={LOUNGE.catTower.x} z={LOUNGE.catTower.z} />
      <FloorLamp x={LOUNGE.lamp.x} z={LOUNGE.lamp.z} lamps={lamps} />
    </group>
  );
}

// ---------- Entrance and cats ----------

function Entrance() {
  return (
    <group>
      <Rug area={DOORMAT} color={TERRACOTTA} border={TERRACOTTA_DARK} />
      {/* Umbrella stand and the chalk A-board */}
      <Cyl r={0.14} h={0.5} position={[UMBRELLA_STAND.x, 0.25, UMBRELLA_STAND.z]} color={MINT} segments={14} />
      <Cyl r={0.02} h={0.8} position={[UMBRELLA_STAND.x + 0.04, 0.6, UMBRELLA_STAND.z]} color={PINK} segments={6} />
      <Cyl r={0.02} h={0.75} position={[UMBRELLA_STAND.x - 0.05, 0.56, UMBRELLA_STAND.z + 0.04]} color={BLUE} segments={6} />
      <group position={[A_BOARD.x, 0, A_BOARD.z]} rotation={[0, -Math.PI / 4, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} rotation={[s * 0.28, 0, 0]} position={[0, 0.5, s * 0.14]}>
            <Box size={[0.6, 1.0, 0.03]} position={[0, 0, 0]} color={OAK} />
            <Box size={[0.5, 0.86, 0.01]} position={[0, 0, s * 0.02]} color={CHALK} cast={false} />
          </group>
        ))}
        <Box size={[0.3, 0.04, 0.01]} position={[0, 0.72, 0.19]} rotation={[0.28, 0, 0]} color={CREAM_SOFT} cast={false} />
        <Box size={[0.38, 0.03, 0.01]} position={[0, 0.58, 0.23]} rotation={[0.28, 0, 0]} color={PINK} cast={false} />
      </group>
    </group>
  );
}

function CatBed({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.24, 0.09, 8, 20]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <Cyl r={0.24} h={0.06} position={[0, 0.03, 0]} color={CREAM_SOFT} segments={20} />
    </group>
  );
}

function CatWheel() {
  return (
    <group position={[CAT_WHEEL.x, 0, CAT_WHEEL.z]} rotation={[0, Math.PI / 4, 0]}>
      <Box size={[0.5, 0.06, 0.3]} position={[0, 0.03, 0]} color={WALNUT} />
      <mesh position={[0, 0.72, 0]} castShadow>
        <torusGeometry args={[0.55, 0.11, 10, 28]} />
        <meshStandardMaterial color={OAK_LIGHT} roughness={0.9} />
      </mesh>
      <Box size={[0.08, 0.7, 0.08]} position={[0, 0.38, 0.18]} color={WALNUT} />
    </group>
  );
}

/** Bunting across the room: little pastel flags on two sagging strings. */
const STRINGS: [number, number, number, number, number][] = [
  [-6.0, -5.4, 2.0, -0.6, 3.5],
  [-6.0, 8.4, 12.0, 0.4, 3.6],
];
function Bunting() {
  const { flags, cords } = useMemo(() => {
    const flags: { x: number; y: number; z: number; color: string; rot: number }[] = [];
    const cords: { x: number; y: number; z: number; len: number; rot: number; tilt: number }[] = [];
    const colors = [PINK, MINT, YELLOW, BLUE];
    STRINGS.forEach(([x0, z0, x1, z1, y], s) => {
      const n = 18;
      const sag = (k: number) => y - Math.sin(k * Math.PI) * 0.45;
      const at = (k: number) => ({ x: x0 + (x1 - x0) * k, z: z0 + (z1 - z0) * k, y: sag(k) });
      const rot = Math.atan2(x1 - x0, z1 - z0);
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const p = at(k);
        flags.push({ x: p.x, z: p.z, y: p.y - 0.14, color: colors[(i + s) % colors.length]!, rot: rot + Math.PI / 2 });
        if (i < n) {
          const q = at((i + 1) / n);
          const dx = q.x - p.x;
          const dz = q.z - p.z;
          const dy = q.y - p.y;
          const flat = Math.hypot(dx, dz);
          cords.push({
            x: (p.x + q.x) / 2,
            y: (p.y + q.y) / 2,
            z: (p.z + q.z) / 2,
            len: Math.hypot(flat, dy),
            rot,
            tilt: Math.atan2(dy, flat),
          });
        }
      }
    });
    return { flags, cords };
  }, []);
  return (
    <>
      {cords.map((c, i) => (
        <group key={`c${i}`} position={[c.x, c.y, c.z]} rotation={[0, c.rot, 0]}>
          <mesh rotation={[Math.PI / 2 - c.tilt, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, c.len, 4]} />
            <meshStandardMaterial color={IRON} />
          </mesh>
        </group>
      ))}
      {flags.map((f, i) => (
        <mesh key={i} position={[f.x, f.y, f.z]} rotation={[0, f.rot, Math.PI]} castShadow>
          <coneGeometry args={[0.13, 0.26, 3]} />
          <meshStandardMaterial color={f.color} roughness={1} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function CafeBulbs({ lamps }: { lamps: number }) {
  const bulbs = useMemo<Bulb[]>(() => {
    const list: Bulb[] = [];
    const cz = (BAR.minZ + BAR.maxZ) / 2;
    for (const x of EDISONS) list.push({ x, y: 2.15, z: cz, s: 1.5, color: '#ffd27a' });
    for (const b of BOOTHS) list.push({ x: b.table.x, y: 2.22, z: b.table.z, s: 1.2, color: '#fff1b0' });
    for (let i = 0; i <= 14; i++) {
      const k = i / 14;
      list.push({ x: -12.6 + k * 4.4, y: 3.4 - Math.sin(k * Math.PI) * 0.5, z: -8.5 + k * 4.2, s: 0.9, color: '#ffe8a8' });
    }
    for (const [x, y, z, c] of [
      [-10.0, 3.0, 4.9, '#ffb3c4'],
      [-7.6, 3.3, 7.1, '#ffd9a0'],
      [-9.0, 2.8, 8.3, '#c9e4ff'],
    ] as const)
      list.push({ x, y, z, s: 3.6, color: c });
    for (const t of CARD_TABLES) list.push({ x: t.x, y: 1.7, z: t.z, s: 1.2, color: '#fff1b0' });
    list.push({ x: LOUNGE.lamp.x, y: 1.58, z: LOUNGE.lamp.z, s: 1.6, color: '#fff1b0' });
    list.push({ x: WOLF.x, y: 0.72, z: WOLF.z, s: 2.4, color: '#ffd27a' });
    const long = TABLES.find((t) => t.kind === 'long')!;
    list.push({ x: long.x, y: 1.82, z: long.z, s: 1.4, color: '#fff1b0' });
    return list;
  }, []);
  return <Bulbs bulbs={bulbs} lamps={lamps} />;
}

/** Paw prints walking across the open floor's rug. */
function PawPrints() {
  const paws = useMemo(() => {
    const list: { x: number; z: number; r: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const k = i / 6;
      const px = FLOOR_AREA.x - 2.4 + k * 4.8 + (i % 2 ? 0.35 : -0.35);
      const pz = FLOOR_AREA.z + 2.0 - k * 4.0;
      list.push({ x: px, z: pz, r: 0.13 });
      for (const [dx, dz] of [
        [-0.14, -0.17],
        [0, -0.21],
        [0.14, -0.17],
      ])
        list.push({ x: px + dx, z: pz + dz, r: 0.06 });
    }
    return list;
  }, []);
  return (
    <>
      {paws.map((p, i) => (
        <mesh key={i} position={[p.x, 0.016, p.z]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <circleGeometry args={[p.r, 12]} />
          <meshStandardMaterial color={TERRACOTTA_DARK} roughness={1} />
        </mesh>
      ))}
    </>
  );
}

export function Cafe({ light, shadows = true }: { light: DayLight; shadows?: boolean }) {
  const lamps = light.lamps;
  return (
    <group>
      <hemisphereLight args={[light.hemiSky, '#d9bfa3', light.hemiIntensity]} />
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
      <StaticBatch>
        <Shell windowColor={light.windowColor} />

        <Rug area={TABLES_RUG} color={RUG_CREAM} border={RUG_CREAM_EDGE} />
        <Rug area={BOARD_AREA} color={PEACH} border={TERRACOTTA} />
        <FourColourRug area={FLOOR_AREA} colors={FLOOR_COLORS} base={CREAM_SOFT} border={TERRACOTTA} />
        <PawPrints />
        {CARD_TABLES.map((t) => (
          <Rug key={t.id} area={t.area} color={RUG_GREEN} border={RUG_GREEN_EDGE} />
        ))}
        <Rug area={ART_AREA} color={RUG_CREAM} border={RUG_CREAM_EDGE} />

        <Bar />
        <WindowBar />
        {TABLES.map((t) => (
          <CafeTableMesh key={t.id} t={t} />
        ))}
        <CafeSeats seats={DESK_SEATS} />
        <Booths />
        <WhiteboardFrame />
        <Lounge lamps={lamps} />
        <Entrance />
        <CardTables />
        <WerewolfCircle wolf={WOLF} seats={WOLF_SEATS} lamps={lamps} />
        <ArtCorner area={ART_AREA} easels={EASELS} cart={PAINT_CART} />

        {CAT_BEDS.map((c, i) => (
          <CatBed key={i} {...c} color={[PINK, MINT, YELLOW, BLUE][i]!} />
        ))}
        <CatWheel />
        {PLANTS.map((p) => (
          <Plant key={`${p.x},${p.z}`} {...p} />
        ))}
        <Print side="back" at={-12.2} y={2.6} color={PINK} w={0.5} h={0.5} />
        <Print side="back" at={-8.3} y={2.7} color={YELLOW} w={0.7} h={0.5} />
        <Bunting />
        <CafeBulbs lamps={lamps} />
      </StaticBatch>
    </group>
  );
}
