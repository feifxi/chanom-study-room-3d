'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { parseJson, sanitizeLook, type NpcView } from '@study/shared';
import { CharacterRig } from '../avatar/character';
import { CHAIR_BACK } from '../room/Avatar';
import type { LabelBoard } from '../room/labels';
import { npcKey, type Bubble } from '../room/roomSession';
import { CatRig } from './CatRig';
import { BlobShadow } from '../room/BlobShadow';

/** A cat or study buddy, eased toward the server's position each frame. */
export function NpcAvatar({ id, npc, board, bubble }: { id: string; npc: NpcView; board: LabelBoard; bubble?: Bubble }) {
  const rig = useMemo(
    () =>
      npc.kind === 'cat'
        ? new CatRig(parseJson<{ coat?: string }>(npc.look, {}).coat ?? 'orange')
        : new CharacterRig(sanitizeLook(parseJson(npc.look, {}))),
    [npc.kind, npc.look],
  );
  useEffect(() => () => rig.dispose(), [rig]);

  const root = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(npc.x, npc.y, npc.z));
  const anchor = useMemo(() => new THREE.Vector3(), []);
  const key = npcKey(id);

  useEffect(() => {
    board.anchors.set(key, anchor);
    return () => {
      board.anchors.delete(key);
    };
  }, [board, key, anchor]);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-dt * 10);
    const p = pos.current;
    // Jumps onto the sofa (or off it) are a quick hop, not a slow slide
    const jump = Math.hypot(npc.x - p.x, npc.z - p.z) > 1.5;
    p.x = jump ? npc.x : p.x + (npc.x - p.x) * k;
    p.z = jump ? npc.z : p.z + (npc.z - p.z) * k;
    p.y += (npc.y - p.y) * Math.min(1, dt * 8);
    const g = root.current;
    if (!g) return;
    g.position.copy(p);
    if (npc.seatId) {
      g.position.x -= Math.sin(npc.yaw) * CHAIR_BACK;
      g.position.z -= Math.cos(npc.yaw) * CHAIR_BACK;
    }

    const t = state.clock.elapsedTime;
    if (rig instanceof CatRig) {
      rig.update(dt, t, npc.yaw, { anim: npc.anim, moving: npc.moving });
      anchor.set(g.position.x, p.y + rig.labelHeight - (npc.anim === 'nap' ? 0.1 : 0), g.position.z);
    } else {
      const talking = !!bubble && bubble.until > Date.now();
      rig.update(dt, t, npc.yaw, { walking: npc.moving, seated: !!npc.seatId, talking, happy: talking || npc.anim === 'stretch' });
      anchor.set(g.position.x, rig.labelHeight + rig.lift, g.position.z);
    }
  });

  return (
    <group ref={root}>
      <BlobShadow radius={npc.kind === 'cat' ? 0.24 : 0.34} />
      <primitive object={rig.group} />
    </group>
  );
}
