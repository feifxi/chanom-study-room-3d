'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useClickToWalk } from '@/lib/controls';
import { pressClosedPanel } from '../room/useDismiss';
import { GachaMachine } from '../npc/GachaMachine';
import { NpcAvatar } from '../npc/NpcAvatar';
import { Avatar, type LocalMotion } from './Avatar';
import type { DayLight } from './dayCycle';
import { FrameDriver } from './FrameDriver';
import { LabelProjector, type LabelBoard } from './labels';
import { perfMeter } from './perf';
import { LocalController, type Hint } from './LocalController';
import type { LocalPlayerDriver } from './LocalPlayerDriver';
import { activeMap } from '../map/active';
import type { MockRoom } from './mockRoom';
import type { Quality } from './quality';
import type { Bubble } from './roomSession';
import { StaticShadows } from './StaticShadows';
import { startZoom, ZOOM, ZoomBridge } from './ZoomControl';

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
  /** Extra 3D layers from features (activities). */
  children?: React.ReactNode;
  /** Frames have been too slow for a while: time for battery saver. */
  onSlow?: () => void;
  /** Bumps when you save a new look (Settings → My character): your character swaps live. */
  myLookVersion?: number;
  /** That look (JSON), so your character shows it straight away. */
  myLook?: string;
}

/** The V1 library scene, driven by the mock room instead of the game server. */
export function RoomCanvas({
  room,
  motion,
  board,
  light,
  quality,
  bubbles,
  findId,
  onHint,
  driverRef,
  zoomRequest,
  onZoom,
  children,
  onSlow,
  myLookVersion = 0,
  myLook,
}: Props) {
  const ids = useMemo(() => [...room.state.players.keys()], [room]);
  const npcIds = useMemo(() => [...room.state.npcs.keys()], [room]);
  const map = activeMap();
  const SPAWN = map.spawn;
  return (
    <Canvas
      shadows="percentage"
      orthographic
      dpr={[1, quality.dpr]}
      frameloop="never"
      camera={{ position: [SPAWN.x + 20, 18, SPAWN.z + 20], zoom: startZoom(), near: 0.1, far: 200 }}
      gl={{ preserveDrawingBuffer: true }}
    >
      <FrameDriver fps={quality.fps} onSlow={onSlow} />
      <StaticShadows lightKey={`${light.sunPosition.join(',')}|${light.sunIntensity.toFixed(2)}|${quality.shadows}`} />
      <map.Scene light={light} shadows={quality.shadows} />
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
      <ClickToWalk driverRef={driverRef} />
      {children}
      <GachaMachine lastSummon={undefined} />
      {npcIds.map((id) => (
        <NpcAvatar key={id} id={id} npc={room.state.npcs.get(id)!} board={board} />
      ))}
      {ids.map((id) => (
        <Avatar
          // A new look remounts your character (new rig) with a sparkle
          key={id === room.sessionId ? `${id}:${myLookVersion}` : id}
          sparkle={id === room.sessionId && myLookVersion > 0}
          lookOverride={id === room.sessionId ? myLook : undefined}
          id={id}
          player={room.state.players.get(id)!}
          isLocal={id === room.sessionId}
          local={motion}
          bubble={bubbles[id]}
          board={board}
          detail={quality.characters}
        />
      ))}
      {findId && <FindMarker room={room} motion={motion} targetId={findId} />}
      <LabelProjector board={board} />
      <PerfProbe board={board} avatars={ids.length + npcIds.length} />
      <ZoomBridge request={zoomRequest} onZoom={onZoom} />
    </Canvas>
  );
}

/**
 * Click or tap the floor to walk there (unless turned off in the Room card's Your settings / Settings → Controls). A click
 * that closes an open panel only closes it. An invisible plane over the floor takes the click (furniture
 * has no handlers, so clicks on it land here too and the path ends next to it). A drag turns the
 * camera instead, so clicks that moved more than a few pixels are ignored.
 */
function ClickToWalk({ driverRef }: { driverRef: React.RefObject<LocalPlayerDriver | null> }) {
  const marker = useRef<THREE.Mesh>(null);
  const [enabled] = useClickToWalk();
  useFrame((state) => {
    const dest = driverRef.current?.dest;
    if (!marker.current) return;
    marker.current.visible = !!dest;
    if (dest) {
      marker.current.position.set(dest.x, 0.04, dest.z);
      marker.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 6) * 0.1);
    }
  });
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        onClick={(e) => {
          if (!enabled || e.delta > 6 || pressClosedPanel()) return;
          e.stopPropagation();
          driverRef.current?.goTo(e.point.x, e.point.z);
        }}
      >
        <planeGeometry args={[activeMap().room.width, activeMap().room.depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={marker} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.18, 0.3, 32]} />
        <meshBasicMaterial color="#ff6fa8" transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </>
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

/** After the frame is drawn (LabelProjector renders at priority 1): what the GPU was asked to do. */
function PerfProbe({ board, avatars }: { board: LabelBoard; avatars: number }) {
  useFrame(({ gl }) => perfMeter.rendered(gl, avatars, board.labels.size), 2);
  return null;
}
