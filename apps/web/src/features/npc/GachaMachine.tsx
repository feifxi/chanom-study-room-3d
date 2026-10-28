'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GACHA_MACHINE, SPIN_REVEAL_MS, type GachaSpun } from '@study/shared';

const CAPSULE_COLORS = ['#ff8fc0', '#8fd3ff', '#ffd76a', '#a8e6a1', '#c3a6ff', '#ffb38a'];

function Box({ args, position, color, rotation }: { args: [number, number, number]; position: [number, number, number]; color: string; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

/**
 * The Buddy Machine: a pastel capsule-toy machine. When anyone spins it, the knob
 * turns, a capsule drops out, rolls forward and pops open just as the NPC appears.
 */
export function GachaMachine({ lastSpin }: { lastSpin: (GachaSpun & { at: number }) | undefined }) {
  const knob = useRef<THREE.Group>(null);
  const dome = useRef<THREE.Group>(null);
  const capsule = useRef<THREE.Group>(null);
  const top = useRef<THREE.Mesh>(null);
  const bottom = useRef<THREE.Mesh>(null);
  const sparkle = useRef<THREE.Group>(null);
  const star = useRef<THREE.Mesh>(null);

  // Capsules resting inside the dome
  const balls = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => {
        const a = (i / 11) * Math.PI * 2;
        const r = 0.16 + (i % 3) * 0.07;
        return { x: Math.cos(a) * r, y: 1.02 + (i % 4) * 0.08, z: Math.sin(a) * r, color: CAPSULE_COLORS[i % CAPSULE_COLORS.length]! };
      }),
    [],
  );

  const capsuleColor = lastSpin?.rare ? '#ffcf3f' : lastSpin?.kind === 'buddy' ? '#8fd3ff' : '#ff8fc0';

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (star.current) {
      // A little star bobs above the machine to say "come play"
      star.current.position.y = 1.95 + Math.sin(t * 2.2) * 0.05;
      star.current.rotation.y = t * 1.2;
    }
    const since = lastSpin ? (Date.now() - lastSpin.at) / 1000 : Infinity;
    const reveal = SPIN_REVEAL_MS / 1000;

    // Knob: two full turns during the first 0.8 s
    if (knob.current) knob.current.rotation.z = since < 0.8 ? -(since / 0.8) * Math.PI * 4 : 0;
    // Capsules jiggle in the dome while it spins
    if (dome.current) dome.current.rotation.y = since < 0.9 ? Math.sin(since * 40) * 0.08 : 0;

    const c = capsule.current;
    if (!c) return;
    const active = since >= 0.75 && since < reveal + 0.6;
    c.visible = active;
    if (!active) return;
    // Drop out of the chute, roll forward with a bounce, then pop open
    const roll = Math.min(1, (since - 0.75) / 0.55);
    c.position.set(0, 0.16 + Math.abs(Math.sin(roll * Math.PI * 2)) * 0.12 * (1 - roll), 0.42 + roll * 0.55);
    c.rotation.x = roll * Math.PI * 3;
    const open = Math.min(1, Math.max(0, (since - 1.35) / 0.3));
    if (top.current && bottom.current) {
      top.current.position.y = open * 0.12;
      top.current.rotation.x = -open * 1.2;
      bottom.current.position.y = -open * 0.04;
    }
    if (open > 0) c.rotation.x = 0;
    const fade = Math.max(0, 1 - Math.max(0, since - reveal) / 0.6);
    c.scale.setScalar(fade);
    if (sparkle.current) {
      const burst = Math.min(1, Math.max(0, (since - 1.4) / 0.5));
      sparkle.current.visible = burst > 0 && burst < 1;
      sparkle.current.scale.setScalar(0.2 + burst * 1.2);
      sparkle.current.rotation.y = since * 3;
    }
  });

  return (
    <group position={[GACHA_MACHINE.x, 0, GACHA_MACHINE.z]} rotation={[0, GACHA_MACHINE.yaw, 0]} scale={1.15}>
      {/* Body */}
      <Box args={[0.86, 0.82, 0.78]} position={[0, 0.41, 0]} color="#ff9fc6" />
      <Box args={[0.92, 0.08, 0.84]} position={[0, 0.84, 0]} color="#ff7fb2" />
      <Box args={[0.6, 0.12, 0.02]} position={[0, 0.7, 0.4]} color="#fff4fa" />
      {/* Chute */}
      <Box args={[0.3, 0.2, 0.08]} position={[0, 0.2, 0.37]} color="#3a2f45" />
      {/* Knob */}
      <group ref={knob} position={[0, 0.48, 0.41]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.11, 0.06, 24]} />
          <meshStandardMaterial color="#ffd76a" metalness={0.3} roughness={0.35} />
        </mesh>
        <Box args={[0.2, 0.04, 0.04]} position={[0, 0, 0.04]} color="#ffb800" />
      </group>
      {/* Glass dome with capsules */}
      <group ref={dome}>
        {balls.map((b, i) => (
          <mesh key={i} position={[b.x, b.y, b.z]} castShadow>
            <sphereGeometry args={[0.085, 14, 10]} />
            <meshStandardMaterial color={b.color} roughness={0.35} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.43, 32, 20]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.28} roughness={0.05} metalness={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.3, 0.1, 24]} />
        <meshStandardMaterial color="#ff7fb2" roughness={0.5} />
      </mesh>
      {/* Bobbing star */}
      <mesh ref={star} position={[0, 1.95, 0]}>
        <octahedronGeometry args={[0.09]} />
        <meshStandardMaterial color="#ffd76a" emissive="#ffd76a" emissiveIntensity={0.6} />
      </mesh>
      {/* The capsule that pops out */}
      <group ref={capsule} visible={false}>
        <mesh ref={top} castShadow>
          <sphereGeometry args={[0.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={capsuleColor} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={bottom} castShadow>
          <sphereGeometry args={[0.1, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <group ref={sparkle} visible={false}>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.25, 0.15 + (i % 2) * 0.1, Math.sin(a) * 0.25]}>
                <octahedronGeometry args={[0.035]} />
                <meshBasicMaterial color={i % 2 ? '#ffd76a' : '#ffffff'} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}
