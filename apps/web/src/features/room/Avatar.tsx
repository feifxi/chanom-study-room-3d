'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sanitizeLook, type PlayerView } from '@study/shared';
import { CharacterRig } from '../avatar/character';
import type { LabelBoard } from './labels';
import type { Bubble } from './roomSession';

/** Where the local player is, written by LocalController and read by its Avatar. */
export interface LocalMotion {
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
}

interface Props {
  id: string;
  player: PlayerView;
  isLocal: boolean;
  local?: React.RefObject<LocalMotion>;
  bubble?: Bubble;
  board: LabelBoard;
}

const HAPPY = /[!🎉🚀👍✨❤♪]/u;
/** How far behind the seat spot the chair sits (matches Library's SeatProps). */
export const CHAIR_BACK = 0.06;

export function Avatar({ id, player, isLocal, local, bubble, board }: Props) {
  const rig = useMemo(() => new CharacterRig(sanitizeLook(safeParse(player.look))), [player.look]);
  useEffect(() => () => rig.dispose(), [rig]);

  const root = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(player.x, 0, player.z));
  const last = useRef(new THREE.Vector3(player.x, 0, player.z));
  const anchor = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    board.anchors.set(id, anchor);
    return () => {
      board.anchors.delete(id);
    };
  }, [board, id, anchor]);

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
    // Seated: settle back onto the chair just behind the seat spot
    if (player.seatId && root.current) {
      root.current.position.x -= Math.sin(yaw) * CHAIR_BACK;
      root.current.position.z -= Math.cos(yaw) * CHAIR_BACK;
    }
    anchor.set(root.current?.position.x ?? pos.current.x, rig.labelHeight + rig.lift, root.current?.position.z ?? pos.current.z);

    const talking = !!bubble && bubble.until > Date.now();
    const dots = board.dots.get(id);
    if (dots) {
      const show = player.typing && !talking ? 'flex' : 'none';
      if (dots.style.display !== show) dots.style.display = show;
    }

    rig.update(dt, t, yaw, {
      walking: !player.seatId && (isLocal ? !!local?.current?.moving : speed > 0.4),
      seated: !!player.seatId,
      talking,
      happy: talking && HAPPY.test(bubble!.text),
    });
  });

  return (
    <group ref={root}>
      <primitive object={rig.group} />
      {isLocal && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.45, 0.56, 40]} />
          <meshBasicMaterial color="#ff6fa8" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
