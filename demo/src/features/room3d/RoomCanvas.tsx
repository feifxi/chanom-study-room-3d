'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SPAWN } from '@study/shared';
import { GachaMachine } from '../npc/GachaMachine';
import { NpcAvatar } from '../npc/NpcAvatar';
import { Avatar, type LocalMotion } from './Avatar';
import type { DayLight } from './dayCycle';
import { FrameDriver } from './FrameDriver';
import { LabelProjector, type LabelBoard } from './labels';
import { Library } from './Library';
import { LocalController, type Hint } from './LocalController';
import type { LocalPlayerDriver } from './LocalPlayerDriver';
import type { MockRoom } from './mockRoom';
import type { Quality } from './quality';
import type { Bubble } from './roomSession';
import { StaticShadows } from './StaticShadows';
import { ZOOM, ZoomBridge } from './ZoomControl';

interface Props {
  room: MockRoom;
  motion: React.RefObject<LocalMotion>;
  board: LabelBoard;
  light: DayLight;
  quality: Quality;
  bubbles: Record<string, Bubble>;
  /** Person to point at (ring under them + arrow at your feet), or null. */
  findId: string | null;
  onHint: (h: Hint | null) => void;
  driverRef: React.RefObject<LocalPlayerDriver | null>;
  /** A zoom the DOM control asked for, applied on the next frame. */
  zoomRequest: { current: number | null };
  onZoom: (percent: number) => void;
}

/** The V1 library scene, driven by the mock room instead of the game server. */
export function RoomCanvas({ room, motion, board, light, quality, bubbles, findId, onHint, driverRef, zoomRequest, onZoom }: Props) {
  const ids = useMemo(() => [...room.state.players.keys()], [room]);
  const npcIds = useMemo(() => [...room.state.npcs.keys()], [room]);
  return (
    <Canvas
      shadows="percentage"
      orthographic
      dpr={[1, quality.dpr]}
      frameloop="never"
      camera={{ position: [SPAWN.x + 20, 18, SPAWN.z + 20], zoom: ZOOM.start, near: 0.1, far: 200 }}
      gl={{ preserveDrawingBuffer: true }}
    >
      <FrameDriver fps={quality.fps} />
      <StaticShadows lightKey={`${light.sunPosition.join(',')}|${light.sunIntensity.toFixed(2)}|${quality.shadows}`} />
      <Library light={light} shadows={quality.shadows} />
      <OrbitControls
        makeDefault
        target={[SPAWN.x, 0.6, SPAWN.z]}
        enablePan={false}
        enableDamping
        minZoom={ZOOM.min}
        maxZoom={ZOOM.max}
        minPolarAngle={0.35}
        maxPolarAngle={1.2}
      />
      <MockTicker room={room} />
      <LocalController room={room} motion={motion} onHint={onHint} onOpenMachine={() => {}} driverRef={driverRef} />
      <GachaMachine lastSummon={undefined} />
      {npcIds.map((id) => (
        <NpcAvatar key={id} id={id} npc={room.state.npcs.get(id)!} board={board} />
      ))}
      {ids.map((id) => (
        <Avatar
          key={id}
          id={id}
          player={room.state.players.get(id)!}
          isLocal={id === room.sessionId}
          local={motion}
          bubble={bubbles[id]}
          board={board}
        />
      ))}
      {findId && <FindMarker room={room} motion={motion} targetId={findId} />}
      <LabelProjector board={board} />
      <ZoomBridge request={zoomRequest} onZoom={onZoom} />
    </Canvas>
  );
}

function MockTicker({ room }: { room: MockRoom }) {
  useFrame((_s, dt) => room.tick(Math.min(dt, 0.1)));
  return null;
}

/** A pulsing ring under the person you're looking for, and an arrow at your feet pointing to them. */
function FindMarker({ room, motion, targetId }: { room: MockRoom; motion: React.RefObject<LocalMotion>; targetId: string }) {
  const ring = useRef<THREE.Mesh>(null);
  const arrow = useRef<THREE.Group>(null);
  useFrame((state) => {
    const target = targetId === room.sessionId ? motion.current : room.state.players.get(targetId);
    const me = motion.current;
    if (!target || !ring.current || !arrow.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.12;
    ring.current.position.set(target.x, 0.03, target.z);
    ring.current.scale.setScalar(pulse);
    const dx = target.x - me.x;
    const dz = target.z - me.z;
    const far = Math.hypot(dx, dz) > 1.6 && targetId !== room.sessionId;
    arrow.current.visible = far;
    arrow.current.position.set(me.x, 0.05, me.z);
    arrow.current.rotation.y = Math.atan2(dx, dz);
  });
  return (
    <>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.68, 48]} />
        <meshBasicMaterial color="#ff6fa8" transparent opacity={0.9} />
      </mesh>
      <group ref={arrow}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.05]}>
          {/* Triangle with a corner on local +z after the -90° tilt, so it points along the group's heading */}
          <circleGeometry args={[0.28, 3, -Math.PI / 2]} />
          <meshBasicMaterial color="#ff6fa8" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.75]}>
          <planeGeometry args={[0.14, 0.5]} />
          <meshBasicMaterial color="#ff6fa8" />
        </mesh>
      </group>
    </>
  );
}
