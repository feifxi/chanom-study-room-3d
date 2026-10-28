'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { sanitizeLook, type PlayerView } from '@study/shared';
import { CharacterRig } from '../avatar/character';
import type { Bubble } from './useStudyRoom';

/** Where the local player is, written by LocalController and read by its Avatar. */
export interface LocalMotion {
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
}

interface Props {
  player: PlayerView;
  isLocal: boolean;
  local?: React.RefObject<LocalMotion>;
  bubble?: Bubble;
}

const HAPPY = /[!🎉🚀👍✨❤♪]/u;

export function Avatar({ player, isLocal, local, bubble }: Props) {
  const rig = useMemo(() => new CharacterRig(sanitizeLook(safeParse(player.look))), [player.look]);
  useEffect(() => () => rig.dispose(), [rig]);
  const root = useRef<THREE.Group>(null);
  const showBubble = bubble && bubble.until > Date.now();

  return (
    <group ref={root}>
      {/* Mover must be the first child so it repositions the group before <Html> reads it each frame */}
      <Mover root={root} rig={rig} player={player} isLocal={isLocal} local={local} bubble={bubble} />
      <primitive object={rig.group} />
      {isLocal && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.45, 0.56, 40]} />
          <meshBasicMaterial color="#ff6fa8" transparent opacity={0.85} />
        </mesh>
      )}
      <Html position={[0, rig.labelHeight, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="flex -translate-y-1/2 flex-col items-center gap-1.5">
          {showBubble && (
            <div className="max-w-48 rounded-xl bg-white px-2.5 py-1.5 text-center text-xs font-semibold leading-snug text-ink shadow-md">
              {bubble.text}
            </div>
          )}
          <div
            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm ${
              isLocal ? 'bg-accent text-white' : 'bg-white/90 text-ink'
            }`}
          >
            {player.name}
            {isLocal && ' (คุณ)'}
          </div>
        </div>
      </Html>
    </group>
  );
}

function Mover({ root, rig, player, isLocal, local, bubble }: Props & { root: React.RefObject<THREE.Group | null>; rig: CharacterRig }) {
  const pos = useRef(new THREE.Vector3(player.x, 0, player.z));
  const last = useRef(new THREE.Vector3(player.x, 0, player.z));

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    let yaw = player.yaw;
    if (isLocal && local?.current) {
      pos.current.set(local.current.x, 0, local.current.z);
      yaw = local.current.yaw;
    } else {
      // Ease toward the latest server position so movement looks smooth between patches
      const k = 1 - Math.exp(-dt * 12);
      pos.current.x += (player.x - pos.current.x) * k;
      pos.current.z += (player.z - pos.current.z) * k;
    }
    const speed = pos.current.distanceTo(last.current) / Math.max(dt, 1e-3);
    last.current.copy(pos.current);
    root.current?.position.copy(pos.current);

    const talking = !!bubble && bubble.until > Date.now();
    rig.update(dt, t, yaw, {
      walking: !player.seatId && (isLocal ? !!local?.current?.moving : speed > 0.4),
      seated: !!player.seatId,
      talking,
      happy: talking && HAPPY.test(bubble!.text),
    });
  });

  return null;
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
