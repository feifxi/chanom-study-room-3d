'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
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
  CREAM_SOFT,
  Cyl,
  Fire,
  FourColourRug,
  GREEN,
  IRON,
  OAK,
  OAK_LIGHT,
  PINK,
  Plant,
  RUG_GREEN,
  RUG_GREEN_EDGE,
  Rug,
  WALNUT,
  WerewolfCircle,
  YELLOW,
  ZoneSign,
  seededRandom,
  type Bulb,
} from './Library';
import { BigScreen, CardTables } from '../activities/Activity3D';
import { WhiteboardFrame } from '../activities/board/Board3D';
import { ArtCorner } from '../activities/telephone/ArtCorner3D';
import {
  ART_AREA,
  BOARD_AREA,
  CAMPFIRE,
  CARD_TABLES,
  CINEMA,
  DECK,
  DESK_SEATS,
  EASELS,
  FLOOR_AREA,
  GACHA_MACHINE,
  GALLERY,
  HAMMOCK,
  LANTERNS,
  PAINT_CART,
  PARAPET,
  PICNIC,
  PICNIC_RUG,
  PICNIC_TABLES,
  PLANTERS,
  POSTS,
  ROOM,
  SEATS,
  STAIRWELL,
  STAIR_DOOR,
  TENT,
  WOLF,
  WOLF_SEATS,
  ZONES,
} from '../map/rooftop';

/**
 * The Starry Rooftop's look (layout in `features/map/rooftop.ts`). Concrete tiles, wooden decking,
 * a parapet with railings all round, the city beyond, string lights between posts and lanterns on
 * the ground. The stairwell block in the back-left corner is the only wall; the sky is the page
 * behind. Same batching rules as the library.
 */

const W = ROOM.width;
const D = ROOM.depth;

const CONCRETE = '#b9b2a6';
const CONCRETE_DARK = '#a39b8e';
const DECKING = '#b48a5e';
const DECKING_EDGE = '#8f6a44';
const GRAVEL = '#9a948a';
const RENDER = '#e7dccb';
const RAIL = '#3f3a3a';
const CANVAS = '#e9dcc3';
const CANVAS_DARK = '#c9b996';
const CITY = '#5d6480';
const CITY_LIGHT = '#737a96';
const FLOOR_COLORS = ['#c7a6b8', '#9fb6d6', '#d6c08f', '#9fc7b4'];

// ---------- The terrace: floor, parapet, stairwell, skyline ----------

function Terrace({ windowColor }: { windowColor: string }) {
  const grout = useMemo(() => Array.from({ length: Math.floor(D / 1.0) - 1 }, (_, i) => -D / 2 + 1.0 * (i + 1)), []);
  const groutX = useMemo(() => Array.from({ length: Math.floor(W / 1.0) - 1 }, (_, i) => -W / 2 + 1.0 * (i + 1)), []);
  const t = PARAPET.thickness;
  const h = PARAPET.height;
  return (
    <group>
      <Box size={[W, 0.4, D]} position={[0, -0.2, 0]} color={CONCRETE} cast={false} />
      {grout.map((z) => (
        <Box key={`z${z}`} size={[W, 0.006, 0.03]} position={[0, 0.002, z]} color={CONCRETE_DARK} cast={false} />
      ))}
      {groutX.map((x) => (
        <Box key={`x${x}`} size={[0.03, 0.006, D]} position={[x, 0.002, 0]} color={CONCRETE_DARK} cast={false} />
      ))}
      {/* Parapet: back (right of the stairwell), left (below the stairwell), right and front, with a rail on top */}
      <Box size={[W / 2 - STAIRWELL.maxX, h, t]} position={[(STAIRWELL.maxX + W / 2) / 2, h / 2, -D / 2 + t / 2]} color={RENDER} />
      <Box size={[t, h, D / 2 - STAIRWELL.maxZ]} position={[-W / 2 + t / 2, h / 2, (STAIRWELL.maxZ + D / 2) / 2]} color={RENDER} />
      <Box size={[t, h, D]} position={[W / 2 - t / 2, h / 2, 0]} color={RENDER} />
      <Box size={[W, h, t]} position={[0, h / 2, D / 2 - t / 2]} color={RENDER} />
      {[
        [(STAIRWELL.maxX + W / 2) / 2, -D / 2 + t / 2, W / 2 - STAIRWELL.maxX, true],
        [-W / 2 + t / 2, (STAIRWELL.maxZ + D / 2) / 2, D / 2 - STAIRWELL.maxZ, false],
        [W / 2 - t / 2, 0, D, false],
        [0, D / 2 - t / 2, W, true],
      ].map(([x, z, len, alongX], i) => (
        <group key={i}>
          <mesh position={[x as number, h + 0.5, z as number]} rotation={alongX ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, len as number, 6]} />
            <meshStandardMaterial color={RAIL} />
          </mesh>
          {Array.from({ length: Math.floor((len as number) / 1.6) + 1 }, (_, k) => -(len as number) / 2 + k * 1.6).map((o) => (
            <Box
              key={o}
              size={[0.04, 0.5, 0.04]}
              position={[alongX ? (x as number) + o : (x as number), h + 0.25, alongX ? (z as number) : (z as number) + o]}
              color={RAIL}
            />
          ))}
        </group>
      ))}
      <Stairwell windowColor={windowColor} />
      <Skyline />
    </group>
  );
}

/** The stairwell block: rendered walls, a door with a lamp over it, a water tank and an AC unit on its roof. */
function Stairwell({ windowColor }: { windowColor: string }) {
  const s = STAIRWELL;
  const cx = (s.minX + s.maxX) / 2;
  const cz = (s.minZ + s.maxZ) / 2;
  return (
    <group>
      <Box size={[s.maxX - s.minX, s.height, s.maxZ - s.minZ]} position={[cx, s.height / 2, cz]} color={RENDER} />
      <Box size={[s.maxX - s.minX + 0.3, 0.2, s.maxZ - s.minZ + 0.3]} position={[cx, s.height + 0.1, cz]} color={CONCRETE_DARK} />
      {/* The door, in the block's right side */}
      <group position={[s.maxX + 0.02, 0, STAIR_DOOR.z]} rotation={[0, Math.PI / 2, 0]}>
        <Box size={[STAIR_DOOR.width + 0.24, 2.3, 0.1]} position={[0, 1.15, 0]} color={WALNUT} />
        <Box size={[STAIR_DOOR.width, 2.1, 0.06]} position={[0, 1.05, 0.05]} color="#4a6b8a" />
        <mesh position={[0, 1.6, 0.09]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial color={windowColor} />
        </mesh>
        <Cyl r={0.025} h={0.22} position={[0.35, 1.0, 0.1]} color={BRASS} segments={8} />
        {/* Exit sign and a caged lamp over the door */}
        <Box size={[0.5, 0.18, 0.04]} position={[0, 2.5, 0.08]} color={GREEN} />
        <mesh position={[0, 2.85, 0.2]} castShadow>
          <sphereGeometry args={[0.12, 10, 8]} />
          <meshStandardMaterial color={IRON} />
        </mesh>
      </group>
      {/* Roof: water tank on legs, an AC unit, a vent */}
      <Cyl r={0.7} h={1.2} position={[cx - 1.2, s.height + 1.1, cz - 0.6]} color={CONCRETE_DARK} segments={16} />
      <Cyl r={0.72} h={0.12} position={[cx - 1.2, s.height + 1.72, cz - 0.6]} color={RAIL} segments={16} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            size={[0.06, 0.5, 0.06]}
            position={[cx - 1.2 + sx * 0.5, s.height + 0.45, cz - 0.6 + sz * 0.5]}
            color={RAIL}
          />
        )),
      )}
      <Box size={[0.9, 0.7, 0.9]} position={[cx + 1.3, s.height + 0.55, cz + 0.6]} color="#cfd4d8" />
      <mesh position={[cx + 1.3, s.height + 0.91, cz + 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.36, 20]} />
        <meshStandardMaterial color={RAIL} side={THREE.DoubleSide} />
      </mesh>
      <Cyl r={0.18} h={0.6} position={[cx + 0.2, s.height + 0.5, cz - 1.2]} color="#cfd4d8" segments={12} />
    </group>
  );
}

/** The city beyond the parapet: blocks of flats behind the back and left edges, windows lit at night (see RooftopBulbs). */
export const CITY_BLOCKS = (() => {
  const rand = seededRandom(42);
  const blocks: { x: number; z: number; w: number; d: number; h: number }[] = [];
  for (let x = -16; x < 18; x += 3.4)
    blocks.push({ x: x + rand() * 0.8, z: -14.5 - rand() * 3, w: 2.4 + rand() * 1.2, d: 2.4, h: 5 + rand() * 7 });
  for (let z = -8; z < 12; z += 3.6)
    blocks.push({ x: -18.5 - rand() * 3, z: z + rand() * 0.8, w: 2.4, d: 2.4 + rand() * 1.2, h: 4 + rand() * 7 });
  return blocks;
})();

function Skyline() {
  return (
    <>
      {CITY_BLOCKS.map((b, i) => (
        <group key={i}>
          <Box size={[b.w, b.h, b.d]} position={[b.x, b.h / 2 - 2, b.z]} color={i % 3 ? CITY : CITY_LIGHT} cast={false} />
          <Box size={[b.w * 0.5, 0.4, b.d * 0.5]} position={[b.x, b.h - 1.8, b.z]} color={CITY_LIGHT} cast={false} />
        </group>
      ))}
    </>
  );
}

// ---------- Picnic desks ----------

function PicnicTables({ seats }: { seats: Seat[] }) {
  return (
    <>
      {PICNIC_TABLES.map((t) => (
        <group key={t.id} position={[t.x, 0, t.z]}>
          <Box size={[PICNIC.w, 0.06, PICNIC.d]} position={[0, 0.75, 0]} color={DECKING} />
          {[-1, 1].map((s) => (
            <Box key={s} size={[PICNIC.w, 0.05, 0.3]} position={[0, 0.42, s * PICNIC.benchZ]} color={DECKING} />
          ))}
          {/* A-frame legs at each end, with a stretcher */}
          {[-1, 1].map((sx) => (
            <group key={sx} position={[sx * (PICNIC.w / 2 - 0.25), 0, 0]}>
              {[-1, 1].map((sz) => (
                <Box key={sz} size={[0.06, 0.8, 0.06]} position={[0, 0.38, sz * 0.5]} rotation={[sz * 0.7, 0, 0]} color={DECKING_EDGE} />
              ))}
              <Box size={[0.06, 0.05, 1.5]} position={[0, 0.39, 0]} color={DECKING_EDGE} />
            </group>
          ))}
          <Cyl r={0.08} h={0.14} position={[0.6, 0.85, 0]} color={CREAM_SOFT} segments={10} />
        </group>
      ))}
      {/* Laptops and notebooks per seat (no chairs: the benches are the seats) */}
      {seats.map((s) => {
        const fx = Math.sin(s.yaw);
        const fz = Math.cos(s.yaw);
        return (
          <group key={s.id}>
            <group position={[s.x + fx * 0.42, 0.79, s.z + fz * 0.42]} rotation={[0, s.yaw + Math.PI, 0]}>
              <Box size={[0.36, 0.02, 0.24]} position={[0, 0, 0.02]} color="#c9ccd4" cast={false} />
              <group position={[0, 0.01, -0.1]} rotation={[-0.35, 0, 0]}>
                <Box size={[0.36, 0.22, 0.015]} position={[0, 0.11, 0]} color="#3a3d46" />
                <mesh position={[0, 0.11, 0.009]}>
                  <planeGeometry args={[0.33, 0.19]} />
                  <meshStandardMaterial color="#3b4a6b" />
                </mesh>
              </group>
            </group>
          </group>
        );
      })}
    </>
  );
}

// ---------- Campfire ----------

function Campfire({ lamps }: { lamps: number }) {
  const logs = SEATS.filter((s) => s.tableId === 'fire');
  return (
    <group>
      <Rug area={CAMPFIRE.area} color={GRAVEL} border={CONCRETE_DARK} />
      <group position={[CAMPFIRE.x, 0, CAMPFIRE.z]}>
        {/* Stone ring, ash, three logs, the fire */}
        <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[CAMPFIRE.pitR, 0.14, 8, 24]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={1} />
        </mesh>
        <Cyl r={CAMPFIRE.pitR - 0.05} h={0.08} position={[0, 0.04, 0]} color="#5b5450" segments={20} />
        {[0, 1.05, 2.1].map((a) => (
          <mesh key={a} position={[0, 0.16, 0]} rotation={[0, a, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.6, 8]} />
            <meshStandardMaterial color="#5a3a26" roughness={1} />
          </mesh>
        ))}
        <group position={[-0.2, 0.1, 0]} scale={1.3}>
          <Fire lamps={lamps} />
        </group>
      </group>
      {/* Log benches around the pit, a blanket folded on one */}
      {logs.map((s, i) => (
        <group key={s.id} position={[s.x - Math.sin(s.yaw) * CHAIR_BACK, 0, s.z - Math.cos(s.yaw) * CHAIR_BACK]} rotation={[0, s.yaw, 0]}>
          <mesh position={[0, 0.24, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.24, 0.24, 1.0, 12]} />
            <meshStandardMaterial color={i % 2 ? '#7a5236' : '#8a6244'} roughness={1} />
          </mesh>
          {i === 2 && <Box size={[0.5, 0.08, 0.4]} position={[0, 0.52, 0]} color={PINK} />}
        </group>
      ))}
    </group>
  );
}

// ---------- Tent and telescope deck ----------

function Tent() {
  return (
    <group>
      <Rug area={TENT.zone} color={DECKING} border={DECKING_EDGE} />
      <group position={[TENT.x, 0, TENT.z]}>
        {/* Bell tent: a canvas cone open toward the terrace, a centre pole, cushions inside */}
        <mesh position={[0, TENT.height / 2, 0]} rotation={[0, Math.PI * 0.75, 0]} castShadow>
          <coneGeometry args={[TENT.r, TENT.height, 24, 1, true, 0, Math.PI * 1.55]} />
          <meshStandardMaterial color={CANVAS} roughness={1} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, TENT.height / 2, 0]} rotation={[0, Math.PI * 0.75, 0]}>
          <coneGeometry args={[TENT.r - 0.02, TENT.height - 0.02, 24, 1, true, 0, Math.PI * 1.55]} />
          <meshStandardMaterial color={CANVAS_DARK} roughness={1} side={THREE.BackSide} />
        </mesh>
        <Cyl r={0.05} h={TENT.height} position={[0, TENT.height / 2, 0]} color={OAK_LIGHT} segments={8} />
        <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[TENT.r - 0.1, 32]} />
          <meshStandardMaterial color="#c9a6b8" roughness={1} />
        </mesh>
        {[0, 1, 2, 3].map((i) => {
          const a = Math.PI / 4 + (i * Math.PI) / 2;
          return (
            <Cyl
              key={i}
              r={0.3}
              h={0.14}
              position={[Math.sin(a) * 0.9, 0.07, Math.cos(a) * 0.9]}
              color={[PINK, YELLOW, BLUE, GREEN][i]!}
              segments={18}
            />
          );
        })}
        <Cyl r={0.12} h={0.22} position={[0.3, 0.11, -0.2]} color={BRASS} segments={10} />
      </group>
      <ZoneSign zone={ZONES[0]!} x={TENT.x - TENT.zone.w / 2 + 0.2} z={TENT.z + TENT.zone.d / 2 - 0.2} />
    </group>
  );
}

function TelescopeDeck({ lamps }: { lamps: number }) {
  const z = DECK.zone;
  const t = DECK.telescope;
  return (
    <group>
      {/* A raised wooden platform with a step, deck chairs, a bench and the telescope */}
      <Box size={[z.w, 0.16, z.d]} position={[z.x, 0.08, z.z]} color={DECKING} />
      <Box size={[z.w + 0.2, 0.04, z.d + 0.2]} position={[z.x, 0.02, z.z]} color={DECKING_EDGE} />
      {DECK.chairs.map((c, i) => (
        <group key={i} position={[c.x - Math.sin(c.yaw) * CHAIR_BACK, 0.16, c.z - Math.cos(c.yaw) * CHAIR_BACK]} rotation={[0, c.yaw, 0]}>
          <Box size={[0.6, 0.05, 0.9]} position={[0, 0.36, 0.1]} rotation={[-0.2, 0, 0]} color={i ? BLUE : PINK} />
          <Box size={[0.6, 0.05, 0.6]} position={[0, 0.72, -0.4]} rotation={[0.5, 0, 0]} color={i ? BLUE : PINK} />
          {[-1, 1].map((sx) => (
            <Box key={sx} size={[0.04, 0.5, 0.04]} position={[sx * 0.3, 0.25, 0]} color={OAK_LIGHT} />
          ))}
        </group>
      ))}
      <Box size={[DECK.bench.w, 0.06, 0.45]} position={[DECK.bench.x, 0.56, DECK.bench.z]} color={OAK_LIGHT} />
      <Box size={[DECK.bench.w, 0.5, 0.06]} position={[DECK.bench.x, 0.85, DECK.bench.z - 0.22]} color={OAK_LIGHT} />
      {[-1, 1].map((sx) => (
        <Box key={sx} size={[0.08, 0.4, 0.4]} position={[DECK.bench.x + sx * (DECK.bench.w / 2 - 0.1), 0.36, DECK.bench.z]} color={OAK} />
      ))}
      <group position={[t.x, 0.16, t.z]} rotation={[0, t.yaw, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[Math.sin((i / 3) * Math.PI * 2) * 0.3, 0.6, Math.cos((i / 3) * Math.PI * 2) * 0.3]}
            rotation={[Math.cos((i / 3) * Math.PI * 2) * 0.25, 0, -Math.sin((i / 3) * Math.PI * 2) * 0.25]}
            castShadow
          >
            <cylinderGeometry args={[0.02, 0.025, 1.25, 6]} />
            <meshStandardMaterial color={IRON} />
          </mesh>
        ))}
        <mesh position={[0, 1.35, 0.1]} rotation={[-0.8, 0, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.13, 1.1, 14]} />
          <meshStandardMaterial color="#dfe6ee" roughness={0.3} metalness={0.3} />
        </mesh>
        <mesh position={[0, 1.0, -0.25]} rotation={[-0.8, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
          <meshStandardMaterial color={IRON} />
        </mesh>
      </group>
      <Lantern x={DECK.lamp.x} z={DECK.lamp.z} lamps={lamps} tall />
      <ZoneSign zone={ZONES[1]!} x={z.x - z.w / 2 + 0.2} z={z.z - z.d / 2 + 0.3} />
    </group>
  );
}

/** A lantern on the ground (or a tall post lamp): the glow is a bulb plus a point light. */
function Lantern({ x, z, lamps, tall = false }: { x: number; z: number; lamps: number; tall?: boolean }) {
  const y = tall ? 1.8 : 0.3;
  return (
    <group position={[x, 0, z]}>
      {tall && <Cyl r={0.03} h={1.7} position={[0, 0.85, 0]} color={IRON} segments={8} />}
      <Box size={[0.26, 0.34, 0.26]} position={[0, y, 0]} color={IRON} />
      <Box size={[0.2, 0.26, 0.2]} position={[0, y, 0]} color={CREAM_SOFT} />
      <Cyl r={0.06} h={0.06} position={[0, y + 0.2, 0]} color={IRON} segments={8} />
      <pointLight position={[0, y + 0.3, 0]} color="#ffc98a" intensity={0.8 + lamps * 2.6} distance={6} decay={1.6} />
    </group>
  );
}

// ---------- Decor ----------

function Hammock() {
  const h = HAMMOCK;
  return (
    <group position={[h.x, 0, h.z]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[(s * h.length) / 2, 0, 0]}>
          <Cyl r={0.07} h={1.5} position={[0, 0.75, 0]} color={OAK} segments={10} />
          <Box size={[0.5, 0.06, 0.5]} position={[0, 0.03, 0]} color={DECKING_EDGE} />
        </group>
      ))}
      <mesh position={[0, 0.75, 0]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[h.length - 0.9, 0.05, 0.9]} />
        <meshStandardMaterial color={GREEN} roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (h.length - 0.5)) / 2, 1.0, 0]} rotation={[0, 0, s * 0.9]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 6]} />
          <meshStandardMaterial color={CANVAS_DARK} />
        </mesh>
      ))}
    </group>
  );
}

function Planter({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box size={[0.7, 0.5, 0.7]} position={[0, 0.25, 0]} color={DECKING_EDGE} />
      <Box size={[0.6, 0.04, 0.6]} position={[0, 0.5, 0]} color="#5a4a3c" />
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.42, 10, 8]} />
        <meshStandardMaterial color="#5fa36a" flatShading />
      </mesh>
      <mesh position={[0.2, 1.15, -0.1]} castShadow>
        <sphereGeometry args={[0.26, 10, 8]} />
        <meshStandardMaterial color="#3f8a55" flatShading />
      </mesh>
    </group>
  );
}

/** Posts for the string lights, and the cords between them (the bulbs are in RooftopBulbs). */
const STRINGS: [number, number][] = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [4, 5],
];
function StringLightPosts() {
  const cords = useMemo(
    () =>
      STRINGS.map(([a, b]) => {
        const p = POSTS[a]!;
        const q = POSTS[b]!;
        return { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, len: Math.hypot(q.x - p.x, q.z - p.z), rot: Math.atan2(q.x - p.x, q.z - p.z) };
      }),
    [],
  );
  return (
    <>
      {POSTS.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <Cyl r={0.05} h={3.2} position={[0, 1.6, 0]} color={RAIL} segments={8} />
          <Box size={[0.4, 0.1, 0.4]} position={[0, 0.05, 0]} color={CONCRETE_DARK} />
        </group>
      ))}
      {cords.map((c, i) => (
        <group key={i} position={[c.x, 3.05, c.z]} rotation={[0, c.rot, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, c.len, 4]} />
            <meshStandardMaterial color={IRON} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Every glowing thing: string lights along the cords, city windows, lantern glass, pendants, the Werewolf lantern. */
function RooftopBulbs({ lamps }: { lamps: number }) {
  const bulbs = useMemo<Bulb[]>(() => {
    const list: Bulb[] = [];
    for (const [a, b] of STRINGS) {
      const p = POSTS[a]!;
      const q = POSTS[b]!;
      const n = Math.round(Math.hypot(q.x - p.x, q.z - p.z) / 0.6);
      for (let i = 1; i < n; i++) {
        const k = i / n;
        list.push({ x: p.x + (q.x - p.x) * k, y: 3.05 - Math.sin(k * Math.PI) * 0.35, z: p.z + (q.z - p.z) * k, s: 1, color: '#ffe8a8' });
      }
    }
    for (const l of LANTERNS) list.push({ x: l.x, y: 0.3, z: l.z, s: 2.2, color: '#ffd27a' });
    list.push({ x: DECK.lamp.x, y: 1.8, z: DECK.lamp.z, s: 2.2, color: '#ffd27a' });
    for (const t of CARD_TABLES) list.push({ x: t.x, y: 1.7, z: t.z, s: 1.2, color: '#fff1b0' });
    list.push({ x: WOLF.x, y: 0.72, z: WOLF.z, s: 2.4, color: '#ffd27a' });
    list.push({ x: GACHA_MACHINE.x - 1.2, y: 2.85, z: GACHA_MACHINE.z + 0.2, s: 1.4, color: '#fff1b0' });
    // City windows, a few per block
    const rand = seededRandom(7);
    for (const b of CITY_BLOCKS)
      for (let y = 0; y < b.h - 2.5; y += 1.2)
        for (let k = 0; k < 2; k++)
          if (rand() > 0.35)
            list.push({
              x: b.x + (k - 0.5) * b.w * 0.5,
              y: y - 1.2,
              z: b.z + b.d / 2 + 0.02,
              s: 1.6,
              color: rand() > 0.5 ? '#ffe3a8' : '#bfe0ff',
            });
    return list;
  }, []);
  return <Bulbs bulbs={bulbs} lamps={lamps} />;
}

/** Stars: a sprinkle of tiny white dots high over the terrace, only really visible at night. */
function Stars({ lamps }: { lamps: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const stars = useMemo(() => {
    const rand = seededRandom(99);
    return Array.from({ length: 160 }, () => ({ x: -30 + rand() * 60, y: 10 + rand() * 14, z: -36 + rand() * 40, s: 0.5 + rand() }));
  }, []);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const m = new THREE.Matrix4();
    stars.forEach((s, i) => {
      m.makeScale(s.s, s.s, s.s);
      m.setPosition(s.x, s.y, s.z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [stars]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, stars.length]} visible={lamps > 0.3}>
      <sphereGeometry args={[0.05, 6, 4]} />
      <meshBasicMaterial color="#fff6d6" toneMapped={false} transparent opacity={Math.min(1, lamps)} />
    </instancedMesh>
  );
}

export function Rooftop({ light, shadows = true }: { light: DayLight; shadows?: boolean }) {
  const lamps = light.lamps;
  return (
    <group>
      <hemisphereLight args={[light.hemiSky, '#8f8a80', light.hemiIntensity * 1.1]} />
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
        <Terrace windowColor={light.windowColor} />

        {/* Decking and mats: every activity and private zone is one */}
        <Rug area={PICNIC_RUG} color={DECKING} border={DECKING_EDGE} />
        <Rug area={CINEMA.area} color="#8a7f9a" border="#6f6580" />
        <Rug area={BOARD_AREA} color={DECKING} border={DECKING_EDGE} />
        <FourColourRug area={FLOOR_AREA} colors={FLOOR_COLORS} base={DECKING} border={DECKING_EDGE} />
        {CARD_TABLES.map((t) => (
          <Rug key={t.id} area={t.area} color={RUG_GREEN} border={RUG_GREEN_EDGE} />
        ))}
        <Rug area={ART_AREA} color={DECKING} border={DECKING_EDGE} />

        <BigScreen />
        {/* Cinema cushions */}
        {CINEMA.cushions.map((c, i) => (
          <Cyl key={i} r={c.r} h={0.16} position={[c.x, 0.08, c.z]} color={[PINK, BLUE, YELLOW, GREEN, PINK, BLUE][i]!} segments={20} />
        ))}
        <WhiteboardFrame />
        <PicnicTables seats={DESK_SEATS} />
        <StringLightPosts />
        <Campfire lamps={lamps} />
        <Tent />
        <TelescopeDeck lamps={lamps} />
        <CardTables />
        <WerewolfCircle wolf={WOLF} seats={WOLF_SEATS} lamps={lamps} />
        <ArtCorner area={ART_AREA} easels={EASELS} cart={PAINT_CART} gallery={GALLERY} />
        <Hammock />
        {LANTERNS.map((l, i) => (
          <Lantern key={i} x={l.x} z={l.z} lamps={lamps} />
        ))}
        {PLANTERS.map((p) => (
          <Planter key={`${p.x},${p.z}`} {...p} />
        ))}
        <Plant x={-4.4} z={-8.4} s={0.9} />
        <RooftopBulbs lamps={lamps} />
        <Stars lamps={lamps} />
      </StaticBatch>
    </group>
  );
}
