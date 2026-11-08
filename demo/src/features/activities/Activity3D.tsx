'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CHAIR_BACK } from '../room3d/Avatar';
import type { SpotState } from './hub';
import { GAME_SEATS, GAME_TABLE, SPOTS, type SpotId } from './spots';

/**
 * The round game table and its four stools (static, so they go inside the room's StaticBatch).
 * A placeholder until feature 12 designs the card games; a green felt top says "games happen here".
 */
export function GameTable() {
  return (
    <group>
      <mesh position={[GAME_TABLE.x, 0.005, GAME_TABLE.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.75, 40]} />
        <meshStandardMaterial color="#d7c9e8" />
      </mesh>
      <mesh position={[GAME_TABLE.x, 0.72, GAME_TABLE.z]} castShadow receiveShadow>
        <cylinderGeometry args={[GAME_TABLE.r, GAME_TABLE.r, 0.06, 32]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.8} />
      </mesh>
      <mesh position={[GAME_TABLE.x, 0.755, GAME_TABLE.z]} receiveShadow>
        <cylinderGeometry args={[GAME_TABLE.r - 0.06, GAME_TABLE.r - 0.06, 0.012, 32]} />
        <meshStandardMaterial color="#2f8f6b" roughness={0.95} />
      </mesh>
      <mesh position={[GAME_TABLE.x, 0.36, GAME_TABLE.z]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, 0.72, 12]} />
        <meshStandardMaterial color="#6b4a33" />
      </mesh>
      {GAME_SEATS.map((s) => {
        // The stool sits where a chair's seat would, a little behind the seat point
        const bx = s.x - Math.sin(s.yaw) * CHAIR_BACK;
        const bz = s.z - Math.cos(s.yaw) * CHAIR_BACK;
        return (
          <group key={s.id} position={[bx, 0, bz]}>
            <mesh position={[0, 0.44, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.22, 0.07, 20]} />
              <meshStandardMaterial color="#e27d9a" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.04, 0.06, 0.4, 8]} />
              <meshStandardMaterial color="#5a3a26" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

const RING_COLOR: Record<string, string> = { gathering: '#ffb3cf', playing: '#ff6fa8', results: '#ffd36e' };

/**
 * What passers-by see of each activity (the "3D world" layer): a glowing ring around a spot that's
 * gathering or playing, cards on the game table mid-round, and Pick a Side's two halves on the floor.
 */
export function ActivityLayer3D({ spots }: { spots: Record<SpotId, SpotState> }) {
  return (
    <>
      {SPOTS.filter((s) => s.built && spots[s.id].phase !== 'free').map((s) => (
        <AreaRing key={s.id} x={s.area.x} z={s.area.z} r={s.area.r} phase={spots[s.id].phase} />
      ))}
      {spots.cards.phase === 'playing' && <TableCards players={spots.cards.players.length + spots.cards.out.length} />}
      {spots.floor.phase === 'playing' && <Sides />}
    </>
  );
}

function AreaRing({ x, z, r, phase }: { x: number; z: number; r: number; phase: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    // Gathering breathes ("come join"); playing holds still
    if (ref.current && phase === 'gathering') ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.02);
  });
  return (
    <mesh ref={ref} position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]} userData={{ dynamic: true }}>
      <ringGeometry args={[r - 0.09, r, 64]} />
      <meshBasicMaterial color={RING_COLOR[phase] ?? '#ffb3cf'} transparent opacity={0.9} depthWrite={false} />
    </mesh>
  );
}

/** A pile in the middle and a few face-down cards in front of each seat. */
function TableCards({ players }: { players: number }) {
  const cards: { x: number; z: number; r: number; color: string }[] = [];
  for (let i = 0; i < 5; i++) cards.push({ x: (i - 2) * 0.03, z: (i % 2) * 0.04, r: i * 0.5, color: i === 4 ? '#ffffff' : '#f6f0ff' });
  GAME_SEATS.slice(0, Math.max(2, players)).forEach((s, i) => {
    const dx = (s.x - GAME_TABLE.x) * 0.38;
    const dz = (s.z - GAME_TABLE.z) * 0.38;
    for (let k = 0; k < 3; k++)
      cards.push({ x: dx + (k - 1) * 0.07, z: dz, r: s.yaw + (k - 1) * 0.15, color: ['#e0457b', '#7c5cff', '#12a37f', '#ef8a3c'][i]! });
  });
  return (
    <group position={[GAME_TABLE.x, 0.77, GAME_TABLE.z]}>
      {cards.map((c, i) => (
        <mesh key={i} position={[c.x, i * 0.002, c.z]} rotation={[-Math.PI / 2, 0, c.r]} userData={{ dynamic: true }}>
          <planeGeometry args={[0.12, 0.17]} />
          <meshStandardMaterial color={c.color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Pick a Side's placeholder: two coloured halves inside the ring (feature 11 designs the real one). */
function Sides() {
  const s = SPOTS.find((x) => x.id === 'floor')!;
  return (
    <group position={[s.area.x, 0.025, s.area.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh userData={{ dynamic: true }}>
        <circleGeometry args={[s.area.r - 0.12, 48, Math.PI / 2, Math.PI]} />
        <meshBasicMaterial color="#7ab8ff" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh userData={{ dynamic: true }}>
        <circleGeometry args={[s.area.r - 0.12, 48, -Math.PI / 2, Math.PI]} />
        <meshBasicMaterial color="#ff8fb8" transparent opacity={0.45} depthWrite={false} />
      </mesh>
    </group>
  );
}
