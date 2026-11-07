'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COFFEE_TABLE, DESK_SEATS, ROOM, TABLES } from '@study/shared';
import type { DayLight } from './dayCycle';
import { CHAIR_BACK } from './Avatar';
import { StaticBatch } from './StaticBatch';

const W = ROOM.width;
const D = ROOM.depth;

const BOOK_COLORS = ['#7c5cff', '#2f80ed', '#e0457b', '#12a37f', '#ef8a3c', '#f2c46d', '#8a5a3a', '#46527f'];

function Box({
  size,
  position,
  color,
  rotation,
  cast = true,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  cast?: boolean;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

/** Small deterministic PRNG (Park–Miller), so the shelves look the same on every visit. */
function seededRandom(seed: number) {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

/** Tall shelf with books drawn as a single InstancedMesh. */
function Bookshelf({ x0, x1 }: { x0: number; x1: number }) {
  const width = x1 - x0;
  const cx = (x0 + x1) / 2;
  const z = -D / 2 + 0.35;
  const books = useMemo(() => {
    const list: { x: number; y: number; w: number; h: number; color: string }[] = [];
    const rand = seededRandom(Math.floor(x0 * 1000) + 7);
    for (const shelfY of [0.25, 0.85, 1.45, 2.05]) {
      let bx = x0 + 0.12;
      while (bx < x1 - 0.2) {
        const w = 0.07 + rand() * 0.07;
        const h = 0.36 + rand() * 0.16;
        if (rand() > 0.08)
          list.push({ x: bx + w / 2, y: shelfY + h / 2, w, h, color: BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)]! });
        bx += w + 0.012;
      }
    }
    return list;
  }, [x0, x1]);

  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    books.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.x, b.y, z + 0.05), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, 0.26));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [books, z]);

  return (
    <group>
      <Box size={[width, 2.6, 0.06]} position={[cx, 1.3, z - 0.3]} color="#7a5236" />
      {[0.2, 0.8, 1.4, 2.0, 2.58].map((y) => (
        <Box key={y} size={[width, 0.06, 0.62]} position={[cx, y, z]} color="#9d7352" />
      ))}
      {[x0, x1].map((x) => (
        <Box key={x} size={[0.08, 2.6, 0.62]} position={[x, 1.3, z]} color="#8a6244" />
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, books.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

function StudyTable({ x, z, width, depth, lamps }: { x: number; z: number; width: number; depth: number; lamps: number }) {
  return (
    <group position={[x, 0, z]}>
      <Box size={[width, 0.08, depth]} position={[0, 0.75, 0]} color="#b98a5e" />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            size={[0.08, 0.72, 0.08]}
            position={[sx * (width / 2 - 0.1), 0.36, sz * (depth / 2 - 0.1)]}
            color="#6b4a33"
          />
        )),
      )}
      {/* Green banker's lamp in the middle of the table */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.04, 16]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.34, 6]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.16, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.42, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#1f6b4a" roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[0.36, 0.02, 0.1]} />
        <meshBasicMaterial color={lamps > 0.5 ? '#fff1b0' : '#f3ead0'} />
      </mesh>
      {/* Reading light, on after dark */}
      {/* Always mounted so day/night only changes brightness: adding or removing lights recompiles every shader */}
      <pointLight position={[0, 1.05, 0]} color="#ffd89a" intensity={lamps * 4} distance={4.5} decay={1.6} />
    </group>
  );
}

/** Per-desk-seat props: chair, open laptop (screen is a share target later) and a notebook. */
function SeatProps() {
  return (
    <>
      {DESK_SEATS.map((s) => {
        // Unit vector from the seat toward its table
        const fx = Math.sin(s.yaw);
        const fz = Math.cos(s.yaw);
        return (
          <group key={s.id}>
            <group position={[s.x - fx * CHAIR_BACK, 0, s.z - fz * CHAIR_BACK]} rotation={[0, s.yaw, 0]}>
              <Box size={[0.46, 0.06, 0.42]} position={[0, 0.44, 0]} color="#8a5a3a" />
              <Box size={[0.46, 0.5, 0.05]} position={[0, 0.72, -0.2]} color="#7a4e32" />
              {[-1, 1].flatMap((sx) =>
                [-1, 1].map((sz) => (
                  <Box key={`${sx}${sz}`} size={[0.04, 0.44, 0.04]} position={[sx * 0.2, 0.22, sz * 0.18]} color="#5a3a26" />
                )),
              )}
            </group>
            <group position={[s.x + fx * 0.42, 0.79, s.z + fz * 0.42]} rotation={[0, s.yaw + Math.PI, 0]}>
              <Box size={[0.36, 0.02, 0.24]} position={[0, 0, 0.02]} color="#c9ccd4" cast={false} />
              <group position={[0, 0.01, -0.1]} rotation={[-0.35, 0, 0]}>
                <Box size={[0.36, 0.22, 0.015]} position={[0, 0.11, 0]} color="#3a3d46" />
                <mesh position={[0, 0.11, 0.009]} name={`screen-${s.id}`}>
                  <planeGeometry args={[0.33, 0.19]} />
                  <meshStandardMaterial color="#20232b" emissive="#3b4a6b" emissiveIntensity={0.35} />
                </mesh>
              </group>
            </group>
            <Box size={[0.18, 0.015, 0.24]} position={[s.x + fx * 0.4 + 0.26, 0.795, s.z + fz * 0.4]} color="#fdf6e3" cast={false} />
          </group>
        );
      })}
    </>
  );
}

function Window({ x, width, color }: { x: number; width: number; color: string }) {
  return (
    <group position={[x, 2.2, -D / 2 + 0.02]}>
      <Box size={[width + 0.2, 2.3, 0.08]} position={[0, 0, 0]} color="#f4efe6" cast={false} />
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[width, 2.1]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Box size={[0.06, 2.1, 0.04]} position={[0, 0, 0.08]} color="#f4efe6" cast={false} />
      <Box size={[width, 0.06, 0.04]} position={[0, 0.2, 0.08]} color="#f4efe6" cast={false} />
    </group>
  );
}

/** Wall clock that shows the viewer's real local time. */
function WallClock() {
  const hour = useRef<THREE.Group>(null);
  const minute = useRef<THREE.Group>(null);
  useFrame(() => {
    const now = new Date();
    const m = now.getMinutes() + now.getSeconds() / 60;
    const h = (now.getHours() % 12) + m / 60;
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2;
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2;
  });
  return (
    <group position={[-W / 2 + 0.04, 2.6, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.06, 32]} />
        <meshStandardMaterial color="#6b4a33" />
      </mesh>
      <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.01, 32]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      <group position={[0, 0, 0.05]}>
        <group ref={hour}>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.035, 0.2, 0.01]} />
            <meshBasicMaterial color="#2b2430" />
          </mesh>
        </group>
        <group ref={minute}>
          <mesh position={[0, 0.14, 0.005]}>
            <boxGeometry args={[0.022, 0.28, 0.01]} />
            <meshBasicMaterial color="#2b2430" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Plant({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.22, 0.5, 16]} />
        <meshStandardMaterial color="#d9805c" />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#5fa36a" flatShading />
      </mesh>
      <mesh position={[0.15, 1.25, -0.1]} castShadow>
        <icosahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial color="#3f8a55" flatShading />
      </mesh>
    </group>
  );
}

function ReadingNook({ lamps }: { lamps: number }) {
  return (
    <group>
      <mesh position={[-8, 0.01, 4.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2, 40]} />
        <meshStandardMaterial color="#e6d3ef" />
      </mesh>
      {/* Sofa: three seats (see SOFA in @study/shared); small cushions on the arms, where cats like to nap */}
      <Box size={[1.2, 0.45, 3]} position={[-9.2, 0.225, 4.1]} color="#6f80d6" />
      <Box size={[0.3, 0.6, 3]} position={[-9.65, 0.7, 4.1]} color="#6f80d6" />
      {[2.75, 5.45].map((z) => (
        <Box key={z} size={[1.2, 0.18, 0.2]} position={[-9.2, 0.54, z]} color="#5d6ec4" />
      ))}
      <mesh position={[COFFEE_TABLE.x, 0.45, COFFEE_TABLE.z]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.05, 24]} />
        <meshStandardMaterial color="#b98a5e" />
      </mesh>
      <mesh position={[COFFEE_TABLE.x, 0.22, COFFEE_TABLE.z]}>
        <cylinderGeometry args={[0.05, 0.05, 0.45, 8]} />
        <meshStandardMaterial color="#6b4a33" />
      </mesh>
      {/* Floor lamp */}
      <mesh position={[-9.4, 0.8, 6.0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.6, 6]} />
        <meshStandardMaterial color="#3a3036" />
      </mesh>
      <mesh position={[-9.4, 1.65, 6.0]}>
        <coneGeometry args={[0.28, 0.32, 20, 1, true]} />
        <meshStandardMaterial color="#fff1c9" emissive="#ffd88a" emissiveIntensity={0.5 + lamps * 1.5} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[-9.4, 1.5, 6.0]} color="#ffd38a" intensity={lamps * 5} distance={6} decay={1.5} />
    </group>
  );
}

export function Library({ light, shadows = true }: { light: DayLight; shadows?: boolean }) {
  return (
    <group>
      <hemisphereLight args={[light.hemiSky, '#cbb89d', light.hemiIntensity]} />
      <directionalLight
        position={light.sunPosition}
        intensity={light.sunIntensity}
        color={light.sunColor}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-radius={3}
      />

      {/* Furniture never moves: merge it into a few meshes (see StaticBatch) */}
      <StaticBatch>
        {/* Floor slab, walls and a runner rug under each table row */}
        <Box size={[W, 0.4, D]} position={[0, -0.2, 0]} color="#e3cfae" cast={false} />
        <Box size={[W + 0.4, 4, 0.2]} position={[0, 2, -D / 2 - 0.1]} color="#f3ede4" />
        <Box size={[0.2, 4, D]} position={[-W / 2 - 0.1, 2, 0]} color="#efe7db" />
        <Box size={[W, 0.16, 0.05]} position={[0, 0.08, -D / 2 + 0.03]} color="#c9b79c" cast={false} />
        {[-2.2, 1.6].map((z) => (
          <mesh key={z} position={[0, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[16, 3]} />
            <meshStandardMaterial color="#c7a17a" />
          </mesh>
        ))}

        <Window x={-1.3} width={1.9} color={light.windowColor} />
        <Window x={1.3} width={1.9} color={light.windowColor} />
        <Bookshelf x0={-9.6} x1={-3.4} />
        <Bookshelf x0={3.4} x1={9.6} />
        <WallClock />

        {TABLES.map((t) => (
          <StudyTable key={t.id} {...t} lamps={light.lamps} />
        ))}
        <SeatProps />
        <ReadingNook lamps={light.lamps} />

        <Plant x={9.3} z={6.2} />
        <Plant x={-9.3} z={-5.6} s={0.9} />
        <Plant x={9.3} z={-5.6} s={0.9} />
      </StaticBatch>
    </group>
  );
}
